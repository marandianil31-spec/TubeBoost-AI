import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  orderBy,
  limit,
  getDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Play, 
  Plus, 
  LogOut, 
  Coins,
  Youtube,
  Eye,
  History,
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('earn');
  const [userData, setUserData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<any[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [targetViews, setTargetViews] = useState('10');
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const timerRef = useRef<any>(null);
  const [botActivity, setBotActivity] = useState<string[]>([]);
  const [selectedCampaignViewers, setSelectedCampaignViewers] = useState<any[]>([]);
  const [isViewersOpen, setIsViewersOpen] = useState(false);
  const [campaignType, setCampaignType] = useState<'view' | 'subscribe'>('view');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchViewers = async (campaignId: string) => {
    const q = query(
      collection(db, 'viewLogs'),
      where('campaignId', '==', campaignId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSelectedCampaignViewers(snapshot.docs.map(doc => doc.data()));
    });
    
    setIsViewersOpen(true);
    return unsubscribe;
  };

  // Simulated Bot Activity Feed
  useEffect(() => {
    const activities = [
      "Bot_Alpha started watching a video",
      "Bot_Beta earned 10 coins",
      "Creator_Bot started a new campaign",
      "Bot_Gamma finished watching a video",
      "System: 50 bots currently active"
    ];
    
    const interval = setInterval(() => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setBotActivity(prev => [randomActivity, ...prev].slice(0, 5));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Simulated Bot View Delivery
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      const activeCampaigns = myCampaigns.filter(c => c.status === 'active' && c.currentViews < c.targetViews);
      if (activeCampaigns.length > 0) {
        const randomCampaign = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];
        if (Math.random() > 0.8) { // 20% chance every 15s
          try {
            await updateDoc(doc(db, 'campaigns', randomCampaign.id), {
              currentViews: increment(1)
            });
            toast.info(`Bot view delivered to: ${randomCampaign.title || 'Your Video'}`, {
              icon: '🤖'
            });
          } catch (e) {
            console.error("Bot view failed", e);
          }
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user, myCampaigns]);

  const [topUsers, setTopUsers] = useState<any[]>([]);

  // Fetch Leaderboard
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('coins', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data()));
    });
    return unsubscribe;
  }, []);

  // Fetch User Data (Coins)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        // Initialize user
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          coins: 100, // Starting bonus
          createdAt: serverTimestamp()
        });
      }
    });
    return unsubscribe;
  }, [user]);

  // Fetch Campaigns to Watch
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', 'active'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeCampaigns = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => c.creatorId !== user.uid && c.currentViews < c.targetViews);
      setCampaigns(activeCampaigns);
    });
    return unsubscribe;
  }, [user]);

  // Fetch My Campaigns
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'campaigns'),
      where('creatorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user]);

  const extractVideoId = (url: string) => {
    const pattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    const videoId = extractVideoId(newVideoUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    const cost = parseInt(targetViews) * (campaignType === 'view' ? 10 : 20);
    if (userData.coins < cost) {
      toast.error("Not enough coins!");
      return;
    }

    try {
      await addDoc(collection(db, 'campaigns'), {
        creatorId: user.uid,
        videoUrl: newVideoUrl,
        videoId: videoId,
        type: campaignType,
        targetViews: parseInt(targetViews),
        currentViews: 0,
        status: 'active',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(-cost)
      });

      setNewVideoUrl('');
      toast.success("Campaign started!");
    } catch (error) {
      toast.error("Failed to start campaign");
    }
  };

  const startWatching = (campaign: any) => {
    if (campaign.creatorId === user?.uid) {
      toast.error("You cannot watch your own video!");
      return;
    }

    if (campaign.type === 'subscribe') {
      setCurrentChannel(campaign);
      setIsSubscribing(true);
      return;
    }

    setCurrentVideo(campaign);
    setIsWatching(true);
    setWatchTime(60); // 60 seconds watch requirement
    
    timerRef.current = setInterval(() => {
      setWatchTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleWatchComplete(campaign);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubscribeComplete = async () => {
    if (!user || !userData || !currentChannel) return;
    setIsVerifying(true);

    // Simulate verification delay
    setTimeout(async () => {
      try {
        const logId = `${user.uid}_${currentChannel.id}`;
        const logRef = doc(db, 'viewLogs', logId);
        const logSnap = await getDoc(logRef);

        if (logSnap.exists()) {
          toast.error("You already subscribed to this channel!");
          setIsSubscribing(false);
          setCurrentChannel(null);
          setIsVerifying(false);
          return;
        }

        const reward = userData.isVip ? 40 : 20; // Subscriptions pay more
        await updateDoc(doc(db, 'users', user.uid), {
          coins: increment(reward)
        });

        await updateDoc(doc(db, 'campaigns', currentChannel.id), {
          currentViews: increment(1)
        });

        await setDoc(logRef, {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          userPhoto: user.photoURL || '',
          campaignId: currentChannel.id,
          type: 'subscribe',
          timestamp: serverTimestamp()
        });

        toast.success(`Subscribed! Earned ${reward} Coins`);
        setIsSubscribing(false);
        setCurrentChannel(null);
      } catch (error) {
        toast.error("Verification failed");
      } finally {
        setIsVerifying(false);
      }
    }, 2000);
  };

  const handleWatchComplete = async (campaign: any) => {
    if (!user || !userData) return;
    
    try {
      // Check if already watched (ViewLog)
      const logId = `${user.uid}_${campaign.id}`;
      const logRef = doc(db, 'viewLogs', logId);
      const logSnap = await getDoc(logRef);

      if (logSnap.exists()) {
        toast.error("You already watched this video!");
        setIsWatching(false);
        setCurrentVideo(null);
        return;
      }

      // Reward user (VIPs get 2x)
      const reward = userData.isVip ? 20 : 10;
      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(reward)
      });

      // Update campaign
      await updateDoc(doc(db, 'campaigns', campaign.id), {
        currentViews: increment(1)
      });

      // Create log
      await setDoc(logRef, {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        campaignId: campaign.id,
        timestamp: serverTimestamp()
      });

      toast.success(`Reward earned: +${reward} Coins! ${userData.isVip ? '(VIP 2x)' : ''}`);
      setIsWatching(false);
      setCurrentVideo(null);
    } catch (error) {
      toast.error("Error rewarding coins");
      setIsWatching(false);
    }
  };

  const handleDailyReward = async () => {
    if (!user || !userData || isClaiming) return;

    const now = new Date();
    const lastReward = userData.lastDailyReward?.toDate();
    
    if (lastReward) {
      const diff = now.getTime() - lastReward.getTime();
      const hours24 = 24 * 60 * 60 * 1000;
      
      if (diff < hours24) {
        const remaining = Math.ceil((hours24 - diff) / (60 * 60 * 1000));
        toast.error(`Please wait ${remaining} hours for next reward`);
        return;
      }
    }

    setIsClaiming(true);
    try {
      const reward = userData.isVip ? 100 : 50;
      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(reward),
        lastDailyReward: serverTimestamp()
      });
      toast.success(`Daily Reward: +${reward} Coins!`);
    } catch (error) {
      toast.error("Failed to claim reward");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleBuyVip = async () => {
    if (!user || !userData) return;
    if (userData.isVip) {
      toast.info("You are already a VIP!");
      return;
    }

    if (userData.coins < 1000) {
      toast.error("You need 1000 coins for VIP!");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(-1000),
        isVip: true
      });
      toast.success("Congratulations! You are now a VIP Member 👑");
    } catch (error) {
      toast.error("Failed to upgrade to VIP");
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      toast.error("Login failed");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md space-y-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500 shadow-inner">
            <Youtube size={48} />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">TubeBoost AI</h1>
            <p className="text-muted-foreground text-base md:text-lg px-4">
              Boost your YouTube views by joining our community. Watch others and get watched back!
            </p>
          </div>
          <Button size="lg" onClick={handleLogin} className="w-full h-14 text-lg gap-3 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/20">
            <Youtube size={24} />
            Login with Google
          </Button>
          <div className="pt-4 flex items-center justify-center gap-6 text-muted-foreground grayscale opacity-60">
            <div className="flex flex-col items-center gap-1">
              <Users size={20} />
              <span className="text-[10px] font-bold uppercase">10k+ Users</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TrendingUp size={20} />
              <span className="text-[10px] font-bold uppercase">Real Views</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex h-16 items-center justify-between px-4 border-b bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2 text-red-600">
          <Youtube size={24} />
          <span className="font-bold text-lg tracking-tight">TubeBoost</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 rounded-full px-3 py-1 flex items-center gap-1.5 border border-red-500/20">
            <Coins className="text-yellow-500" size={14} />
            <span className="font-bold text-red-600 text-sm">{userData?.coins || 0}</span>
          </div>
          <button onClick={() => signOut(auth)} className="text-muted-foreground">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        <div className="p-6 flex items-center gap-2 text-red-600">
          <Youtube size={24} />
          <span className="font-bold text-xl tracking-tight">TubeBoost</span>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'earn', icon: Play, label: 'Earn Coins' },
            { id: 'campaigns', icon: Plus, label: 'Add Video' },
            { id: 'my-videos', icon: History, label: 'My Videos' },
            { id: 'leaderboard', icon: TrendingUp, label: 'Top Users' },
            { id: 'vip', icon: TrendingUp, label: 'VIP Store' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
          <div className="p-4 border-t space-y-4">
            <div className="bg-muted rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                <AlertCircle size={12} />
                Bot Activity
              </div>
              <div className="space-y-1">
                {botActivity.map((act, i) => (
                  <p key={i} className="text-[10px] truncate text-muted-foreground animate-pulse">
                    {act}
                  </p>
                ))}
              </div>
            </div>

            <div className="bg-red-500/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="text-yellow-500" size={20} />
              <span className="font-bold text-red-600">{userData?.coins || 0}</span>
            </div>
            <span className="text-[10px] font-bold uppercase text-red-600/60">Balance</span>
          </div>
          <Button variant="ghost" className="w-full mt-4 justify-start gap-2 text-muted-foreground" onClick={() => signOut(auth)}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col pb-20 md:pb-0">
        <ScrollArea className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'earn' && (
              <motion.div key="earn" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {/* Bot Activity (Mobile Only) */}
                  <div className="md:hidden bg-muted/50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-muted-foreground/70">
                      <AlertCircle size={10} />
                      Live Network Activity
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {botActivity.slice(0, 3).map((act, i) => (
                        <p key={i} className="text-[9px] truncate text-muted-foreground/80 animate-pulse">
                          • {act}
                        </p>
                      ))}
                    </div>
                  </div>

                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-lg">
                    <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <h3 className="text-xl font-bold">Daily Reward</h3>
                        <p className="text-red-100 text-sm">Claim your free coins every 24 hours.</p>
                      </div>
                      <Button 
                        onClick={handleDailyReward} 
                        disabled={isClaiming}
                        className="w-full sm:w-auto bg-white text-red-600 hover:bg-red-50 font-bold h-12 sm:h-10"
                      >
                        {isClaiming ? 'Claiming...' : 'Claim 50+ Coins'}
                      </Button>
                    </CardContent>
                  </Card>

                  {userData?.isVip && (
                    <Card className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-none shadow-lg">
                      <CardContent className="p-4 md:p-6 flex flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold">VIP Active 👑</h3>
                          <p className="text-yellow-100 text-sm">Earning 2x coins per watch!</p>
                        </div>
                        <TrendingUp size={40} className="opacity-50 shrink-0" />
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Earn Coins</h2>
                    <p className="text-sm md:text-base text-muted-foreground">Watch videos or subscribe to earn coins.</p>
                  </div>
                  <div className="md:hidden flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/20">
                    <Coins size={16} />
                    {userData?.coins || 0} Coins
                  </div>
                </div>

                {isWatching && currentVideo ? (
                  <Card className="overflow-hidden border-2 border-red-500">
                    <div className="aspect-video bg-black relative">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&controls=0&disablekb=1&modestbranding=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                      <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/80 text-white px-3 py-1 md:px-4 md:py-2 rounded-full font-mono text-lg md:text-xl">
                        {watchTime}s
                      </div>
                    </div>
                    <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-red-50">
                      <div className="text-center sm:text-left">
                        <h3 className="font-bold text-lg">Watching: {currentVideo.title || 'Community Video'}</h3>
                        <p className="text-sm text-red-600">Do not close this tab to earn your reward!</p>
                      </div>
                      <Badge className="bg-red-500">Watching</Badge>
                    </CardContent>
                  </Card>
                ) : isSubscribing && currentChannel ? (
                  <Card className="overflow-hidden border-none shadow-2xl bg-card">
                    <div className="p-8 md:p-12 text-center space-y-6">
                      <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-600 shadow-inner">
                        <Youtube size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black">Subscribe & Earn</h3>
                        <p className="text-muted-foreground">Subscribe to this channel to earn <span className="text-yellow-600 font-bold">{userData?.isVip ? '40' : '20'} Coins</span></p>
                      </div>
                      
                      <div className="flex flex-col gap-3 max-w-xs mx-auto">
                        <Button 
                          className="h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-600/30"
                          onClick={() => window.open(currentChannel.videoUrl, '_blank')}
                        >
                          1. Open Channel
                        </Button>
                        <Button 
                          variant="outline"
                          className="h-14 border-2 font-bold text-lg rounded-2xl"
                          onClick={handleSubscribeComplete}
                          disabled={isVerifying}
                        >
                          {isVerifying ? 'Verifying...' : '2. Confirm Subscription'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground"
                          onClick={() => { setIsSubscribing(false); setCurrentChannel(null); }}
                        >
                          Skip Task
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {campaigns.length > 0 ? campaigns.map(campaign => (
                      <Card key={campaign.id} className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group border-none bg-card shadow-sm" onClick={() => startWatching(campaign)}>
                        <div className="aspect-video sm:aspect-[16/9] relative">
                          <img 
                            src={`https://img.youtube.com/vi/${campaign.videoId}/mqdefault.jpg`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="text-white" size={48} />
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold truncate text-sm mb-2">{campaign.title || 'YouTube Video'}</h3>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-yellow-600 font-bold text-sm">
                              <Coins size={14} />
                              +{campaign.type === 'subscribe' ? (userData?.isVip ? '40' : '20') : (userData?.isVip ? '20' : '10')} Coins
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {campaign.type === 'subscribe' ? 'Subscribe' : '60 Secs'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )) : (
                      <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                          <Eye size={32} />
                        </div>
                        <p className="text-muted-foreground">No videos available to watch right now. Check back later!</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'campaigns' && (
              <motion.div key="campaigns" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-6 md:space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Boost Your Video</h2>
                  <p className="text-sm md:text-base text-muted-foreground">Get real views from real people in our community.</p>
                  <div className="md:hidden inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/20">
                    <Coins size={16} />
                    {userData?.coins || 0} Coins Available
                  </div>
                </div>

                <Card className="border-none shadow-lg">
                  <CardContent className="pt-6 px-4 md:px-6">
                    <form onSubmit={handleCreateCampaign} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          type="button"
                          variant={campaignType === 'view' ? 'default' : 'outline'}
                          className={`h-12 rounded-xl font-bold ${campaignType === 'view' ? 'bg-red-600' : ''}`}
                          onClick={() => setCampaignType('view')}
                        >
                          <Eye size={18} className="mr-2" />
                          Views
                        </Button>
                        <Button 
                          type="button"
                          variant={campaignType === 'subscribe' ? 'default' : 'outline'}
                          className={`h-12 rounded-xl font-bold ${campaignType === 'subscribe' ? 'bg-red-600' : ''}`}
                          onClick={() => setCampaignType('subscribe')}
                        >
                          <Users size={18} className="mr-2" />
                          Subs
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          {campaignType === 'view' ? 'YouTube Video Link' : 'YouTube Channel Link'}
                        </label>
                        <div className="relative">
                          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <Input 
                            className="pl-10 h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-red-500" 
                            placeholder="Paste Video, Shorts, or Live link here..." 
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                            required
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground px-1">Supports: Watch, Shorts, Live, and Mobile links</p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target {campaignType === 'view' ? 'Views' : 'Subscribers'}</label>
                        <select 
                          className="w-full h-12 px-4 rounded-xl border-none bg-muted/50 font-medium focus:ring-2 focus:ring-red-500 outline-none"
                          value={targetViews}
                          onChange={(e) => setTargetViews(e.target.value)}
                        >
                          <option value="10">10 {campaignType === 'view' ? 'Views' : 'Subs'} ({parseInt('10') * (campaignType === 'view' ? 10 : 20)} Coins)</option>
                          <option value="50">50 {campaignType === 'view' ? 'Views' : 'Subs'} ({parseInt('50') * (campaignType === 'view' ? 10 : 20)} Coins)</option>
                          <option value="100">100 {campaignType === 'view' ? 'Views' : 'Subs'} ({parseInt('100') * (campaignType === 'view' ? 10 : 20)} Coins)</option>
                          <option value="500">500 {campaignType === 'view' ? 'Views' : 'Subs'} ({parseInt('500') * (campaignType === 'view' ? 10 : 20)} Coins)</option>
                        </select>
                      </div>

                      <div className="bg-red-500/5 p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-500/10">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 shadow-inner">
                            <Coins size={24} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Cost</span>
                            <span className="font-black text-2xl text-red-600">{parseInt(targetViews) * (campaignType === 'view' ? 10 : 20)} Coins</span>
                          </div>
                        </div>
                        <Button type="submit" className="w-full sm:w-auto h-12 px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20">
                          Start Campaign
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
                  <AlertCircle size={20} className="shrink-0" />
                  <p>
                    <strong>How it works:</strong> Your video will be shown to other users in the "Earn" section. 
                    They must watch for at least 60 seconds to earn coins, ensuring high-quality retention views for your channel.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'my-videos' && (
              <motion.div key="my-videos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold">My Campaigns</h2>
                  <div className="md:hidden flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/20">
                    <Coins size={16} />
                    {userData?.coins || 0} Coins
                  </div>
                </div>
                <div className="grid gap-4">
                  {myCampaigns.length > 0 ? myCampaigns.map(campaign => (
                    <Card key={campaign.id} className="flex flex-col md:flex-row overflow-hidden border-none bg-card shadow-sm">
                      <div className="w-full md:w-48 aspect-video sm:aspect-[16/9] md:aspect-video">
                        <img 
                          src={`https://img.youtube.com/vi/${campaign.videoId}/mqdefault.jpg`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <CardContent className="flex-1 p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h3 className="font-bold truncate text-sm md:text-base">{campaign.title || 'YouTube Video'}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye size={14} />
                              {campaign.currentViews} / {campaign.targetViews} Views
                            </span>
                            <span>Started: {campaign.createdAt?.toDate().toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                          <div className="flex flex-col items-end gap-2">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 transition-all" 
                                style={{ width: `${(campaign.currentViews / campaign.targetViews) * 100}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 gap-1"
                                onClick={() => fetchViewers(campaign.id)}
                              >
                                <Users size={12} />
                                Viewers
                              </Button>
                              <Badge variant={campaign.currentViews >= campaign.targetViews ? "secondary" : "default"} className="text-[10px]">
                                {campaign.currentViews >= campaign.targetViews ? "Completed" : "Active"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="py-20 text-center text-muted-foreground">
                      You haven't started any campaigns yet.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Leaderboard</h2>
                  <p className="text-sm md:text-base text-muted-foreground">Top coin earners in the community.</p>
                </div>

                <div className="space-y-3">
                  {topUsers.map((u, i) => (
                    <Card key={u.uid} className={`border-none shadow-sm ${u.uid === user?.uid ? 'bg-red-500/5 border border-red-500/20' : 'bg-card'}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            i === 0 ? 'bg-yellow-400 text-white shadow-lg' : 
                            i === 1 ? 'bg-gray-300 text-white' : 
                            i === 2 ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-sm md:text-base truncate max-w-[120px] md:max-w-[200px]">
                                {u.displayName || 'Anonymous'}
                              </span>
                              {u.isVip && <TrendingUp size={14} className="text-yellow-500" />}
                            </div>
                            {u.uid === user?.uid && <span className="text-[10px] font-bold text-red-500 uppercase">You</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-yellow-600 font-black text-lg">
                          <Coins size={18} />
                          {u.coins.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
            {activeTab === 'vip' && (
              <motion.div key="vip" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-6 md:space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold">VIP Membership</h2>
                  <p className="text-sm md:text-base text-muted-foreground">Upgrade to VIP to grow your channel 2x faster.</p>
                  <div className="md:hidden inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/20">
                    <Coins size={16} />
                    {userData?.coins || 0} Coins Available
                  </div>
                </div>

                <div className="grid gap-6">
                  <Card className={`relative overflow-hidden border-2 ${userData?.isVip ? 'border-yellow-500 shadow-yellow-500/10' : 'border-muted'} shadow-xl`}>
                    {userData?.isVip && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 rounded-bl-xl text-[10px] font-bold tracking-widest">
                        ACTIVE MEMBER
                      </div>
                    )}
                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="mx-auto w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center text-yellow-600 mb-4 shadow-inner rotate-3">
                        <TrendingUp size={40} />
                      </div>
                      <CardTitle className="text-3xl font-black">VIP Creator</CardTitle>
                      <CardDescription className="text-base">The ultimate boost for your channel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-6 md:p-8">
                      <ul className="space-y-4">
                        {[
                          "Earn 2x Coins per watch (20 Coins)",
                          "Daily Reward increased to 100 Coins",
                          "Priority Bot Views (Faster delivery)",
                          "VIP Badge on your profile",
                          "No Ads (Coming Soon)"
                        ].map((feature, i) => (
                          <li key={i} className="flex items-center gap-4 text-sm md:text-base font-medium">
                            <div className="h-6 w-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0 border border-green-500/20">
                              ✓
                            </div>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Separator className="opacity-50" />

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center sm:text-left">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">One-Time Price</p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-4xl font-black text-yellow-600">
                            <Coins size={32} />
                            1,000
                          </div>
                        </div>
                        <Button 
                          onClick={handleBuyVip} 
                          disabled={userData?.isVip}
                          className={`w-full sm:w-auto h-14 px-10 text-lg font-bold rounded-2xl transition-all ${
                            userData?.isVip 
                              ? 'bg-muted text-muted-foreground' 
                              : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/30 hover:scale-105'
                          }`}
                        >
                          {userData?.isVip ? 'Already VIP' : 'Upgrade Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </main>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex items-center justify-around h-16 px-2 z-50">
        {[
          { id: 'earn', icon: Play, label: 'Earn' },
          { id: 'campaigns', icon: Plus, label: 'Boost' },
          { id: 'my-videos', icon: History, label: 'History' },
          { id: 'leaderboard', icon: TrendingUp, label: 'Top' },
          { id: 'vip', icon: TrendingUp, label: 'VIP' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              activeTab === item.id ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Viewers Dialog */}
      <Dialog open={isViewersOpen} onOpenChange={setIsViewersOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="text-red-600" />
              Recent Viewers
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {selectedCampaignViewers.length > 0 ? selectedCampaignViewers.map((viewer, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border-2 border-red-500/20">
                      <AvatarImage src={viewer.userPhoto} />
                      <AvatarFallback className="text-[10px]">{viewer.userName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate max-w-[150px]">{viewer.userName}</span>
                      <span className="text-[10px] text-muted-foreground">Watched: {viewer.timestamp?.toDate().toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                    Verified View
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Eye className="mx-auto mb-2 opacity-20" size={48} />
                  <p>No viewers logged yet.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
