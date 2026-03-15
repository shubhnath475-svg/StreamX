/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Home, 
  Compass, 
  PlaySquare, 
  Clock, 
  ThumbsUp, 
  Share2, 
  MoreVertical, 
  Bell, 
  User, 
  Download, 
  Settings, 
  LogOut,
  ChevronLeft,
  X,
  Maximize,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Zap,
  Mic,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, User as UserType } from './types';
import { MOCK_VIDEOS, MOCK_SHORTS } from './mockData';
import { searchVideos, getTrendingVideos, getUserCountry, isApiKeyConfigured } from './services/youtubeService';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentView, setCurrentView] = useState('Home');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [userCountry, setUserCountry] = useState('US');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [realHistory, setRealHistory] = useState<Video[]>([]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastVideoElementRef = (node: HTMLDivElement | null) => {
    if (isSearching || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMoreVideos();
      }
    });
    if (node) observer.current.observe(node);
  };

  const loadMoreVideos = async () => {
    if (isLoadingMore || !isApiKeyConfigured) return;
    setIsLoadingMore(true);
    try {
      // For simplicity, we'll just fetch trending videos again or search with current query
      const moreVideos = searchQuery 
        ? await searchVideos(searchQuery, userCountry)
        : await getTrendingVideos(userCountry);
      
      setVideos(prev => {
        const uniqueNew = moreVideos.filter(v => !prev.find(p => p.id === v.id));
        return [...prev, ...uniqueNew];
      });
    } catch (error) {
      console.error('Error loading more videos:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const categories = ['All', 'Technology', 'Travel', 'Food', 'Health', 'Sports', 'Music', 'Gaming', 'News'];

  useEffect(() => {
    // Detect user country
    getUserCountry().then(country => {
      setUserCountry(country);
      // Load trending videos for this country
      getTrendingVideos(country).then(trending => {
        if (trending.length > 0) {
          setVideos(prev => [...trending, ...prev.filter(v => !trending.find(tv => tv.id === v.id))]);
        }
      });
    });

    // Load user from localStorage
    const savedUser = localStorage.getItem('streamx_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Ensure watchLater exists for backward compatibility
      if (!parsedUser.watchLater) {
        parsedUser.watchLater = [];
      }
      setUser(parsedUser);
      setIsLoggedIn(true);
    }
    
    // Load custom videos from localStorage
    const savedVideos = localStorage.getItem('streamx_custom_videos');
    if (savedVideos) {
      const customVideos = JSON.parse(savedVideos);
      setVideos([...MOCK_VIDEOS, ...customVideos]);
    }

    // Load history from localStorage
    const savedHistory = localStorage.getItem('streamx_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Load search history
    const savedSearchHistory = localStorage.getItem('streamx_search_history');
    if (savedSearchHistory) {
      setSearchHistory(JSON.parse(savedSearchHistory));
    }

    // Handle OAuth Success
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const { tokens } = event.data;
        setYoutubeAccessToken(tokens.access_token);
        localStorage.setItem('youtube_access_token', tokens.access_token);
        showToast('Successfully connected to YouTube!');
        fetchHistory(tokens.access_token);
      }
    };

    window.addEventListener('message', handleOAuthMessage);

    const savedToken = localStorage.getItem('youtube_access_token');
    if (savedToken) {
      setYoutubeAccessToken(savedToken);
      fetchHistory(savedToken);
    }

    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const fetchHistory = async (token: string) => {
    const { fetchYouTubeHistory } = await import('./services/youtubeService');
    const historyVideos = await fetchYouTubeHistory(token);
    setRealHistory(historyVideos);
  };

  useEffect(() => {
    if (selectedCategory !== 'All') {
      executeSearch(selectedCategory, true);
    } else {
      // Reset to trending
      getTrendingVideos(userCountry).then(trending => {
        if (trending.length > 0) {
          setVideos(trending);
        }
      });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedVideo) {
      setHistory(prev => {
        const filtered = prev.filter(id => id !== selectedVideo.id);
        const updated = [selectedVideo.id, ...filtered];
        localStorage.setItem('streamx_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedVideo]);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('streamx_history');
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('streamx_search_history');
  };

  const MOCK_USERS: UserType[] = [
    {
      id: 'user1',
      name: 'Guest User',
      email: 'guest@example.com',
      avatar: 'https://picsum.photos/seed/user/100/100',
      subscriptions: [],
      likedVideos: [],
      history: [],
      watchLater: []
    },
    {
      id: 'user2',
      name: 'Tech Enthusiast',
      email: 'tech@example.com',
      avatar: 'https://picsum.photos/seed/user2/100/100',
      subscriptions: [],
      likedVideos: [],
      history: [],
      watchLater: []
    },
    {
      id: 'user3',
      name: 'Gaming Pro',
      email: 'gaming@example.com',
      avatar: 'https://picsum.photos/seed/user3/100/100',
      subscriptions: [],
      likedVideos: [],
      history: [],
      watchLater: []
    }
  ];

  const handleLogin = () => {
    const newUser = MOCK_USERS[0];
    setUser(newUser);
    setIsLoggedIn(true);
    localStorage.setItem('streamx_user', JSON.stringify(newUser));
  };

  const handleYouTubeLogin = async () => {
    try {
      const response = await fetch('/api/auth/url');
      const { url } = await response.json();
      window.open(url, 'youtube_oauth', 'width=600,height=600');
    } catch (error) {
      console.error('Error getting auth URL:', error);
      showToast('Failed to start YouTube login');
    }
  };

  const handleSwitchAccount = () => {
    if (!user) {
      handleLogin();
      return;
    }
    const currentIndex = MOCK_USERS.findIndex(u => u.id === user.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % MOCK_USERS.length;
    const nextUser = MOCK_USERS[nextIndex];
    
    setUser(nextUser);
    setIsLoggedIn(true);
    localStorage.setItem('streamx_user', JSON.stringify(nextUser));
    showToast(`Switched to ${nextUser.name}`);
  };

  const toggleWatchLater = (videoId: string) => {
    if (!user) {
      handleLogin();
      return;
    }

    const isWatchLater = user.watchLater.includes(videoId);
    const updatedWatchLater = isWatchLater
      ? user.watchLater.filter(id => id !== videoId)
      : [...user.watchLater, videoId];
    
    const updatedUser = { ...user, watchLater: updatedWatchLater };
    setUser(updatedUser);
    localStorage.setItem('streamx_user', JSON.stringify(updatedUser));
  };

  const toggleLikedVideo = (videoId: string) => {
    if (!user) {
      handleLogin();
      return;
    }

    const isLiked = user.likedVideos?.includes(videoId) || false;
    const updatedLikedVideos = isLiked
      ? (user.likedVideos || []).filter(id => id !== videoId)
      : [...(user.likedVideos || []), videoId];
    
    const updatedUser = { ...user, likedVideos: updatedLikedVideos };
    setUser(updatedUser);
    localStorage.setItem('streamx_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('streamx_user');
    setShowProfileMenu(false);
  };

  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const handleUpload = (newVideo: Video) => {
    const updatedVideos = [newVideo, ...videos];
    setVideos(updatedVideos);
    
    // Save only custom videos to localStorage (MOCK_VIDEOS are static)
    const customVideos = updatedVideos.filter(v => !MOCK_VIDEOS.find(mv => mv.id === v.id));
    localStorage.setItem('streamx_custom_videos', JSON.stringify(customVideos));
    setShowUploadModal(false);
  };

  const filteredVideos = videos.filter(video => {
    // If we have a lastSearchQuery (meaning we executed an API search), 
    // we should be more lenient or just show the videos that were returned.
    // To keep it simple, we check if the video matches the current search query.
    // But to prevent hiding API results that don't strictly contain the query string,
    // we can check if the video was fetched from YouTube (category === 'YouTube') 
    // and we recently searched. Actually, a better approach is to just do a simple text match
    // but split the query into words.
    
    if (!searchQuery) return selectedCategory === 'All' || video.category === selectedCategory;
    
    const queryWords = searchQuery.toLowerCase().split(' ').filter(Boolean);
    const videoTitle = video.title || '';
    const videoChannel = video.channelName || '';
    const videoDesc = video.description || '';
    const videoText = `${videoTitle} ${videoChannel} ${videoDesc}`.toLowerCase();
    
    const matchesSearch = queryWords.some(word => videoText.includes(word));
    const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchHistory(true);
    if (selectedVideo) {
      setSelectedVideo(null);
    }
    if (currentView !== 'Home') {
      setCurrentView('Home');
    }
  };

  const executeSearch = async (queryToSearch = searchQuery, isCategory = false) => {
    if (!queryToSearch.trim()) return;
    
    setSearchQuery(isCategory ? '' : queryToSearch);
    setIsSearching(true);
    setShowSearch(false);
    setShowSearchHistory(false);
    setSelectedVideo(null);
    setSelectedChannel(null);
    if (!isCategory) setSelectedCategory('All');
    setCurrentView('Home');
    setLastSearchQuery(queryToSearch);

    // Save to search history
    setSearchHistory(prev => {
      const updated = [queryToSearch, ...prev.filter(q => q !== queryToSearch)].slice(0, 10);
      localStorage.setItem('streamx_search_history', JSON.stringify(updated));
      return updated;
    });

    try {
      const results = await searchVideos(queryToSearch, userCountry);
      if (results.length > 0) {
        // Mark these as search results so they can be prioritized or shown
        setVideos(prev => {
          const newVideos = results.filter(r => !prev.find(p => p.id === r.id));
          return [...newVideos, ...prev];
        });
      } else if (!isApiKeyConfigured) {
        showToast("YouTube API key is missing. Please configure VITE_YOUTUBE_API_KEY in your environment variables to search the entire YouTube database.");
      } else {
        showToast("No results found on YouTube for this search.");
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      showToast(`Search failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChannelClick = (channelName: string) => {
    setSelectedChannel(channelName);
    setCurrentView('Channel');
    setSelectedVideo(null);
    setSidebarOpen(window.innerWidth > 1024);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0f0f0f] text-white' : 'bg-white text-gray-900'}`}>
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 ${darkMode ? 'bg-[#0f0f0f]' : 'bg-white'} border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => { setSelectedVideo(null); setSelectedChannel(null); setCurrentView('Home'); }}>
            <div className="bg-red-600 p-1 rounded-lg">
              <Play size={18} fill="white" color="white" />
            </div>
            <span className="text-xl font-bold tracking-tighter">StreamX</span>
          </div>
        </div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex items-center flex-1 max-w-2xl px-10 relative gap-4">
          <div className="flex-1 relative">
            <div className={`flex items-center w-full rounded-full border ${darkMode ? 'border-[#303030] bg-[#121212]' : 'border-[#cccccc] bg-white'} overflow-hidden`}>
              <div className="pl-4 pr-1 hidden md:block">
                {showSearchHistory && <Search size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />}
              </div>
              <input 
                type="text" 
                placeholder="Search" 
                className={`flex-1 px-4 md:px-2 py-2 bg-transparent outline-none text-base ${darkMode ? 'text-white' : 'text-black'}`}
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              />
              <button 
                onClick={() => executeSearch()}
                className={`px-5 py-2 flex items-center justify-center ${darkMode ? 'bg-[#222222] border-l border-[#303030] hover:bg-[#303030]' : 'bg-[#f8f8f8] border-l border-[#cccccc] hover:bg-[#f0f0f0]'} transition-colors`}
                title="Search"
              >
                <Search size={20} className={darkMode ? 'text-white' : 'text-black'} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Search History Dropdown */}
            <AnimatePresence>
              {showSearchHistory && searchHistory.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-white border-gray-200'}`}
                >
                <div className="py-2">
                  {searchHistory.map((query, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                      onClick={() => executeSearch(query)}
                    >
                      <Clock size={16} className="text-gray-500" />
                      <span className="flex-1 text-sm font-medium">{query}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHistory = searchHistory.filter(q => q !== query);
                          setSearchHistory(newHistory);
                          localStorage.setItem('streamx_search_history', JSON.stringify(newHistory));
                        }}
                        className="text-blue-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="px-4 py-2 text-right border-t border-gray-500/20 mt-2">
                    <button onClick={clearSearchHistory} className="text-xs text-gray-500 hover:text-red-500">Clear all search history</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          <button className={`p-2.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-[#181818] hover:bg-[#303030]' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`} title="Search with your voice">
            <Mic size={20} className={darkMode ? 'text-white' : 'text-black'} />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isLoggedIn && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} text-sm font-medium`}
            >
              <PlaySquare size={18} className="text-red-600" />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}
          <button 
            onClick={() => setShowSearch(true)}
            className={`md:hidden p-2 rounded-full hover:${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}
          >
            <Search size={20} />
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full hover:${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}
          >
            <Bell size={20} />
          </button>
          {isLoggedIn ? (
            <div className="relative">
              <img 
                src={user?.avatar} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                referrerPolicy="no-referrer"
              />
              
              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-white border-gray-200'}`}
                  >
                    <div className="p-4 flex items-start gap-4 border-b border-gray-500/20">
                      <img src={user?.avatar} alt="Avatar" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                      <div>
                        <div className="font-bold">{user?.name}</div>
                        <div className="text-sm text-gray-500">@{user?.name.toLowerCase().replace(/\s/g, '')}</div>
                        <button 
                          className="text-blue-500 text-sm mt-2 hover:underline"
                          onClick={() => {
                            window.open('https://myaccount.google.com/', '_blank');
                            setShowProfileMenu(false);
                          }}
                        >
                          Manage your Google Account
                        </button>
                      </div>
                    </div>
                    
                    <div className="py-2 border-b border-gray-500/20">
                      {!youtubeAccessToken && (
                        <button 
                          className={`w-full flex items-center gap-4 px-4 py-2 text-red-500 font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                          onClick={handleYouTubeLogin}
                        >
                          <Play size={18} fill="currentColor" />
                          <span>Connect YouTube History</span>
                        </button>
                      )}
                      <button 
                        className={`w-full flex items-center gap-4 px-4 py-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          setSelectedVideo(null); 
                          setSelectedChannel(null); 
                          setCurrentView('You');
                          setShowProfileMenu(false);
                        }}
                      >
                        <User size={20} />
                        <span>Your channel</span>
                      </button>
                      <button 
                        className={`w-full flex items-center gap-4 px-4 py-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          setSelectedVideo(null); 
                          setSelectedChannel(null); 
                          setCurrentView('Dashboard');
                          setShowProfileMenu(false);
                        }}
                      >
                        <PlaySquare size={20} />
                        <span>YouTube Studio</span>
                      </button>
                      <button 
                        className={`w-full flex items-center gap-4 px-4 py-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          handleSwitchAccount();
                          setShowProfileMenu(false);
                        }}
                      >
                        <User size={20} />
                        <span>Switch account</span>
                      </button>
                      <button 
                        className={`w-full flex items-center gap-4 px-4 py-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={handleLogout}
                      >
                        <LogOut size={20} />
                        <span>Sign out</span>
                      </button>
                    </div>
                    
                    <div className="py-2">
                      <button 
                        className={`w-full flex items-center gap-4 px-4 py-2 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          setDarkMode(!darkMode);
                          setShowProfileMenu(false);
                        }}
                      >
                        <Settings size={20} />
                        <span>Appearance: {darkMode ? 'Dark' : 'Light'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full text-sm font-medium hover:bg-blue-500/10"
            >
              <User size={18} />
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal 
            onClose={() => setShowUploadModal(false)} 
            onUpload={handleUpload} 
            darkMode={darkMode} 
            categories={categories.filter(c => c !== 'All')}
          />
        )}
      </AnimatePresence>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed inset-0 z-[60] p-2 ${darkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}
          >
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSearch(false)} className={`p-2 rounded-full ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><ChevronLeft size={24} /></button>
              <div className={`flex-1 flex items-center rounded-full ${darkMode ? 'bg-[#222222]' : 'bg-gray-100'} px-4 py-1.5`}>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search YouTube" 
                  className={`bg-transparent outline-none flex-1 text-base ${darkMode ? 'text-white' : 'text-black'}`}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className={darkMode ? 'text-gray-400' : 'text-gray-500'}><X size={20} /></button>}
              </div>
              <button className={`p-2 rounded-full ${darkMode ? 'bg-[#222222]' : 'bg-gray-100'}`}>
                <Mic size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex pt-14 h-screen overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-50 lg:z-0 h-full lg:h-auto
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-0 lg:w-20'} 
          flex flex-col border-r ${darkMode ? 'border-white/10 bg-[#0f0f0f]' : 'border-gray-200 bg-white'} 
          transition-all duration-300 overflow-y-auto overflow-x-hidden
        `}>
          <div className="p-3 space-y-1">
            <SidebarItem 
              icon={<Home size={20} />} 
              label="Home" 
              active={currentView === 'Home' && !selectedVideo} 
              onClick={() => { 
                setSelectedVideo(null); 
                setCurrentView('Home');
                setSidebarOpen(window.innerWidth > 1024); 
              }} 
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
            <SidebarItem 
              icon={<Zap size={20} />} 
              label="Shorts" 
              active={currentView === 'Shorts'}
              onClick={() => {
                setCurrentView('Shorts');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
            <SidebarItem 
              icon={<PlaySquare size={20} />} 
              label="Subscriptions" 
              active={currentView === 'Subscriptions'}
              onClick={() => {
                setCurrentView('Subscriptions');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
            <SidebarItem 
              icon={<Clock size={20} />} 
              label="Watch Later" 
              active={currentView === 'WatchLater'}
              onClick={() => {
                setCurrentView('WatchLater');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
          </div>
          <hr className={`my-2 ${darkMode ? 'border-white/10' : 'border-gray-200'}`} />
          <div className="p-3 space-y-1">
            <SidebarItem 
              icon={<Bell size={20} />} 
              label="Notifications" 
              active={currentView === 'Notifications'}
              onClick={() => {
                setCurrentView('Notifications');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
            <SidebarItem 
              icon={<Clock size={20} />} 
              label="History" 
              active={currentView === 'History'}
              onClick={() => {
                setCurrentView('History');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
            <SidebarItem 
              icon={isLoggedIn ? <img src={user?.avatar} className="w-6 h-6 rounded-full" /> : <User size={20} />} 
              label="You" 
              active={currentView === 'You'}
              onClick={() => {
                setCurrentView('You');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
          </div>
          <hr className={`my-2 ${darkMode ? 'border-white/10' : 'border-gray-200'}`} />
          <div className="p-3 space-y-1">
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Settings" 
              active={currentView === 'Settings'}
              onClick={() => {
                setCurrentView('Settings');
                setSelectedVideo(null);
                setSidebarOpen(window.innerWidth > 1024);
              }}
              collapsed={!sidebarOpen && window.innerWidth > 1024} 
              darkMode={darkMode} 
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative pb-16 lg:pb-0">
          <AnimatePresence mode="wait">
            {selectedVideo ? (
              <motion.div
                key="player"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-40 bg-[#0f0f0f] overflow-y-auto"
              >
                <VideoPlayerView 
                  video={selectedVideo} 
                  onClose={() => setSelectedVideo(null)} 
                  darkMode={darkMode}
                  recommendedVideos={MOCK_VIDEOS.filter(v => v.id !== selectedVideo.id)}
                  onVideoSelect={setSelectedVideo}
                  onChannelClick={handleChannelClick}
                  onWatchLater={toggleWatchLater}
                  isWatchLater={user?.watchLater.includes(selectedVideo.id) || false}
                  onLike={toggleLikedVideo}
                  isLiked={user?.likedVideos?.includes(selectedVideo.id) || false}
                  showToast={showToast}
                />
              </motion.div>
            ) : currentView === 'History' ? (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HistoryView 
                  history={history} 
                  videos={videos} 
                  onVideoSelect={setSelectedVideo} 
                  darkMode={darkMode} 
                  onClearHistory={clearHistory} 
                />
              </motion.div>
            ) : currentView === 'Liked' ? (
              <motion.div
                key="liked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LikedVideosView 
                  likedVideos={user?.likedVideos || []} 
                  videos={videos} 
                  onVideoSelect={setSelectedVideo} 
                  darkMode={darkMode} 
                  onRemove={toggleLikedVideo} 
                />
              </motion.div>
            ) : currentView === 'WatchLater' ? (
              <motion.div
                key="watchlater"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <WatchLaterView 
                  watchLater={user?.watchLater || []} 
                  videos={videos} 
                  onVideoSelect={setSelectedVideo} 
                  darkMode={darkMode} 
                  onRemove={toggleWatchLater} 
                />
              </motion.div>
            ) : currentView === 'You' ? (
              <motion.div
                key="you"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <YouView 
                  user={user} 
                  isLoggedIn={isLoggedIn} 
                  onLogin={handleLogin} 
                  onLogout={handleLogout} 
                  onSwitchAccount={handleSwitchAccount}
                  darkMode={darkMode}
                  setCurrentView={setCurrentView}
                />
              </motion.div>
            ) : currentView === 'Shorts' ? (
              <motion.div
                key="shorts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ShortsView shorts={MOCK_SHORTS} darkMode={darkMode} />
              </motion.div>
            ) : currentView === 'Dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardView user={user} videos={videos} darkMode={darkMode} />
              </motion.div>
            ) : currentView === 'Settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsView 
                  darkMode={darkMode} 
                  setDarkMode={setDarkMode} 
                  setCurrentView={setCurrentView} 
                />
              </motion.div>
            ) : currentView === 'Channel' && selectedChannel ? (
              <motion.div
                key={`channel-${selectedChannel}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChannelView 
                  channelName={selectedChannel} 
                  videos={videos.filter(v => v.channelName === selectedChannel)}
                  darkMode={darkMode}
                  onVideoSelect={setSelectedVideo}
                />
              </motion.div>
            ) : (
              <motion.div 
                key={currentView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                {currentView === 'Home' ? (
                  <>
                    {/* Categories */}
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === cat 
                              ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') 
                              : (darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200')
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {!isApiKeyConfigured && (
                      <div className={`mb-6 p-4 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'} flex items-center gap-3`}>
                        <Zap size={20} className="shrink-0" />
                        <p className="text-sm">
                          <strong>YouTube API Key Missing:</strong> To search all YouTube videos, please add your API Key in the settings menu or .env file.
                        </p>
                      </div>
                    )}

                    {isSearching ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-medium">Searching StreamX...</p>
                      </div>
                    ) : filteredVideos.length > 0 ? (
                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.05
                            }
                          }
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      >
                        {filteredVideos.map((video, index) => (
                          <motion.div
                            key={video.id}
                            ref={index === filteredVideos.length - 1 ? lastVideoElementRef : null}
                            variants={{
                              hidden: { opacity: 0, y: 20 },
                              visible: { opacity: 1, y: 0 }
                            }}
                          >
                            <VideoCard 
                              video={video} 
                              onClick={() => setSelectedVideo(video)} 
                              onChannelClick={handleChannelClick}
                              darkMode={darkMode} 
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Search size={64} className="text-gray-500 mb-4" />
                        <h3 className="text-xl font-bold">No results found</h3>
                        <p className="text-gray-500 mt-2">Try different keywords or check your spelling.</p>
                        <button 
                          onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                          className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-bold"
                        >
                          Reset Search
                        </button>
                      </div>
                    )}

                    {isLoadingMore && (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                      {currentView === 'Explore' && <Compass size={40} />}
                      {currentView === 'Shorts' && <Zap size={40} />}
                      {currentView === 'Subscriptions' && <PlaySquare size={40} />}
                      {currentView === 'Notifications' && <Bell size={40} />}
                      {currentView === 'You' && <User size={40} />}
                      {currentView === 'Library' && <PlaySquare size={40} />}
                      {currentView === 'History' && <Clock size={40} />}
                      {currentView === 'Liked' && <ThumbsUp size={40} />}
                      {currentView === 'Downloads' && <Download size={40} />}
                    </div>
                    <h2 className="text-2xl font-bold">{currentView}</h2>
                    
                    {currentView === 'History' && youtubeAccessToken && realHistory.length > 0 ? (
                      <div className="w-full mt-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
                          {realHistory.map(video => (
                            <VideoCard 
                              key={video.id} 
                              video={video} 
                              onClick={() => setSelectedVideo(video)} 
                              onChannelClick={handleChannelClick}
                              darkMode={darkMode} 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-500 mt-2 max-w-md">
                          {currentView === 'Explore' && "Discover trending videos and new creators across StreamX."}
                          {currentView === 'Shorts' && "Short-form videos to keep you entertained for hours."}
                          {currentView === 'Subscriptions' && "Videos from the channels you subscribe to will appear here."}
                          {currentView === 'Notifications' && "Stay updated with the latest from your favorite creators."}
                          {currentView === 'You' && "Your personal space on StreamX. Manage your profile and settings."}
                          {currentView === 'Library' && "Your saved playlists, watch later, and other library items."}
                          {currentView === 'History' && (youtubeAccessToken ? "Your YouTube history will appear here." : "Connect your YouTube account to see your watch history.")}
                          {currentView === 'Liked' && "Videos you've liked will be saved here for easy access."}
                          {currentView === 'Downloads' && "Watch your downloaded videos offline anytime."}
                        </p>
                        {!youtubeAccessToken && currentView === 'History' && (
                          <button 
                            onClick={handleYouTubeLogin}
                            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-bold flex items-center gap-2"
                          >
                            <Play size={18} fill="white" />
                            Connect YouTube
                          </button>
                        )}
                        <button 
                          onClick={() => setCurrentView('Home')}
                          className="mt-8 px-6 py-2 border border-gray-500/30 rounded-full font-bold"
                        >
                          Go to Home
                        </button>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14 border-t ${darkMode ? 'bg-[#0f0f0f] border-white/10' : 'bg-white border-gray-200'} px-2`}>
        <BottomNavItem 
          icon={<Home size={20} />} 
          label="Home" 
          active={currentView === 'Home' && !selectedVideo} 
          onClick={() => { setCurrentView('Home'); setSelectedVideo(null); setSelectedChannel(null); }} 
          darkMode={darkMode} 
        />
        <BottomNavItem 
          icon={<Zap size={20} />} 
          label="Shorts" 
          active={currentView === 'Shorts'} 
          onClick={() => { setCurrentView('Shorts'); setSelectedVideo(null); setSelectedChannel(null); }} 
          darkMode={darkMode} 
        />
        <BottomNavItem 
          icon={<PlaySquare size={20} />} 
          label="Subscriptions" 
          active={currentView === 'Subscriptions'} 
          onClick={() => { setCurrentView('Subscriptions'); setSelectedVideo(null); setSelectedChannel(null); }} 
          darkMode={darkMode} 
        />
        <BottomNavItem 
          icon={<Bell size={20} />} 
          label="Notifications" 
          active={currentView === 'Notifications'} 
          onClick={() => { setCurrentView('Notifications'); setSelectedVideo(null); setSelectedChannel(null); }} 
          darkMode={darkMode} 
        />
        <BottomNavItem 
          icon={isLoggedIn ? <img src={user?.avatar} className="w-6 h-6 rounded-full" /> : <User size={20} />} 
          label="You" 
          active={currentView === 'You'} 
          onClick={() => { setCurrentView('You'); setSelectedVideo(null); setSelectedChannel(null); }} 
          darkMode={darkMode} 
        />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BottomNavItem({ icon, label, active, onClick, darkMode }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, darkMode: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${active ? (darkMode ? 'text-white' : 'text-black') : 'text-gray-500'}`}
    >
      <div className={active ? 'text-red-600' : ''}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, active = false, onClick, collapsed, darkMode }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed: boolean, darkMode: boolean, key?: any }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-5 w-full p-2.5 rounded-xl transition-colors ${
        active 
          ? (darkMode ? 'bg-white/10' : 'bg-gray-100') 
          : `hover:${darkMode ? 'bg-white/5' : 'bg-gray-100'}`
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <div className={active ? 'text-red-600' : ''}>{icon}</div>
      {!collapsed && <span className={`text-sm ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>}
    </button>
  );
}

function VideoCard({ video, onClick, onChannelClick, darkMode }: { video: Video, onClick: () => void, onChannelClick: (name: string) => void, darkMode: boolean, key?: any }) {
  return (
    <div className="group cursor-pointer transform transition-all duration-300 hover:scale-[1.02]">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800" onClick={onClick}>
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {video.duration}
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <img 
          src={video.channelAvatar} 
          alt={video.channelName} 
          className="w-9 h-9 rounded-full flex-shrink-0 hover:opacity-80 transition-opacity" 
          referrerPolicy="no-referrer"
          onClick={() => onChannelClick(video.channelName)}
        />
        <div className="flex flex-col">
          <h3 className={`text-sm font-semibold line-clamp-2 leading-tight cursor-pointer ${darkMode ? 'text-white' : 'text-gray-900'}`} onClick={onClick}>
            {video.title}
          </h3>
          <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div 
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              onClick={() => onChannelClick(video.channelName)}
            >
              {video.channelName}
              <CheckCircle2 size={12} fill="currentColor" className="text-gray-500" />
            </div>
            <div className="flex items-center" onClick={onClick}>
              <span>{video.views} views</span>
              <span className="mx-1">•</span>
              <span>{video.postedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUpload, darkMode, categories }: { onClose: () => void, onUpload: (v: Video) => void, darkMode: boolean, categories: string[] }) {
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setStep(2);
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress(progress);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !title) return;

    const newVideo: Video = {
      id: Date.now().toString(),
      title,
      description,
      category,
      thumbnail: thumbnailUrl || `https://picsum.photos/seed/${Date.now()}/800/450`,
      videoUrl: URL.createObjectURL(videoFile),
      channelName: 'Guest User',
      channelAvatar: 'https://picsum.photos/seed/user/100/100',
      views: '0',
      postedAt: 'Just now',
      duration: '0:00', // In a real app, we'd calculate this from the file
      likes: 0,
      subscribers: '0'
    };

    onUpload(newVideo);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${darkMode ? 'bg-[#282828] text-white' : 'bg-white text-gray-900'}`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <h2 className="text-xl font-bold">Upload video</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-[#1f1f1f]' : 'bg-gray-100'}`}>
                <Download size={48} className="text-gray-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">Select video files to upload</h3>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your videos will be private until you publish them.</p>
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors"
              >
                SELECT FILES
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-lg font-bold">Details</h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Title (required)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Add a title that describes your video" 
                      className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-transparent border-white/20 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500'} outline-none transition-colors`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                    <textarea 
                      rows={4}
                      placeholder="Tell viewers about your video" 
                      className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-transparent border-white/20 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500'} outline-none transition-colors resize-none`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select 
                      className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-[#1f1f1f] border-white/20 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500'} outline-none transition-colors`}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center relative`}>
                  {uploadProgress < 100 ? (
                    <div className="flex flex-col items-center gap-4 p-4 text-center">
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                      <span className="text-sm font-medium">Uploading {Math.round(uploadProgress)}%</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Play size={48} fill="white" className="opacity-50" />
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        UPLOAD COMPLETE
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold">Thumbnail</h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select or upload a picture that shows what's in your video.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => setThumbnailUrl(`https://picsum.photos/seed/${Date.now()}/800/450`)}
                      className={`aspect-video rounded-lg border-2 border-dashed flex items-center justify-center ${darkMode ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <Download size={20} className="text-gray-500" />
                    </button>
                    {thumbnailUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden border-2 border-blue-500">
                        <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className={`p-4 border-t flex items-center justify-between ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Video Link</span>
            <span className="text-sm text-blue-500 truncate max-w-[200px]">streamx.io/v/{Date.now()}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-6 py-2 text-sm font-bold hover:bg-white/10 rounded-full">CANCEL</button>
            {step === 2 && (
              <button 
                onClick={handleSubmit}
                disabled={uploadProgress < 100 || !title}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${
                  uploadProgress === 100 && title 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : (darkMode ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400')
                }`}
              >
                PUBLISH
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function VideoPlayerView({ 
  video, 
  onClose, 
  darkMode, 
  recommendedVideos, 
  onVideoSelect, 
  onChannelClick,
  onWatchLater,
  isWatchLater,
  onLike,
  isLiked,
  showToast
}: { 
  video: Video, 
  onClose: () => void, 
  darkMode: boolean, 
  recommendedVideos: Video[], 
  onVideoSelect: (v: Video) => void, 
  onChannelClick: (name: string) => void,
  onWatchLater: (id: string) => void,
  isWatchLater: boolean,
  onLike: (id: string) => void,
  isLiked: boolean,
  showToast: (msg: string) => void
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState([
    { id: '1', userName: 'Alex Rivera', userAvatar: 'https://picsum.photos/seed/alex/100/100', text: 'This is exactly what I was looking for! Thanks for sharing.', timestamp: '2 hours ago', likes: 24 },
    { id: '2', userName: 'Sarah Chen', userAvatar: 'https://picsum.photos/seed/sarah/100/100', text: 'The production quality is amazing. Keep it up!', timestamp: '5 hours ago', likes: 12 },
    { id: '3', userName: 'Mike Johnson', userAvatar: 'https://picsum.photos/seed/mike/100/100', text: 'Could you do a follow-up on the advanced techniques?', timestamp: '1 day ago', likes: 8 },
  ]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleCanPlay = () => setIsBuffering(false);

    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('canplay', handleCanPlay);

    // Try to play immediately
    const playVideo = () => {
      videoElement.play().catch(err => {
        console.log("Autoplay prevented:", err);
        setIsPlaying(false);
      });
    };

    // Setup Media Session API for background playback
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: video.channelName,
        artwork: [
          { src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        videoElement.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        videoElement.pause();
      });
    }

    // Small delay to ensure DOM is ready and animation has started
    const timeout = setTimeout(playVideo, 100);

    return () => {
      clearTimeout(timeout);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('playing', handlePlaying);
      videoElement.removeEventListener('canplay', handleCanPlay);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [video.videoUrl, video.title, video.channelName, video.thumbnail]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (progressRef.current) {
        const currentProgress = (video.currentTime / video.duration) * 100;
        progressRef.current.style.width = `${currentProgress}%`;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in a comment or search
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          seek(-10);
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          seek(10);
          break;
        case 'f':
          e.preventDefault();
          // Toggle fullscreen logic could go here
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]); // Re-bind when isPlaying changes to ensure togglePlay has correct state

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + amount));
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      userName: 'Guest User',
      userAvatar: 'https://picsum.photos/seed/user/100/100',
      text: commentText,
      timestamp: 'Just now',
      likes: 0
    };
    
    setComments([newComment, ...comments]);
    setCommentText('');
  };

  const handleDownload = () => {
    setIsDownloaded(true);
    // Simulate download progress
    setTimeout(() => {
      showToast('Video downloaded successfully for offline viewing!');
    }, 1500);
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1600px] mx-auto min-h-screen ${darkMode ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
      {/* Back Button for Mobile/Tablet */}
      <button 
        onClick={onClose}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Player Section */}
      <div className="flex-1">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group">
          {video.videoUrl.includes('youtube.com/embed/') ? (
            <iframe 
              src={`${video.videoUrl}?autoplay=1&playsinline=1&enablejsapi=1&mute=${isMuted ? 1 : 0}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIsBuffering(false)}
            />
          ) : (
            <>
              <video 
                ref={videoRef}
                src={video.videoUrl} 
                className="w-full h-full"
                autoPlay
                playsInline
                preload="auto"
                muted={isMuted}
                onClick={togglePlay}
              />

              {/* Loading Spinner */}
              <AnimatePresence>
                {isBuffering && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                  >
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Big Play Button Overlay */}
              <AnimatePresence>
                {!isPlaying && !isBuffering && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Play size={40} fill="white" className="text-white ml-1" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/30 rounded-full mb-4 cursor-pointer relative">
                  <div 
                    ref={progressRef}
                    className="absolute top-0 left-0 h-full bg-red-600 rounded-full" 
                    style={{ width: '0%' }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                      {isPlaying ? <Pause fill="white" /> : <Play fill="white" />}
                    </button>
                    <button className="text-white hover:scale-110 transition-transform"><SkipForward fill="white" /></button>
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                      {isMuted ? <VolumeX /> : <Volume2 />}
                    </button>
                    <span className="text-white text-xs font-medium">0:00 / {video.duration}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button 
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="text-white text-xs font-bold hover:bg-white/20 px-2 py-1 rounded transition-colors"
                      >
                        {playbackRate}x
                      </button>
                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden border border-white/10 min-w-[80px]"
                          >
                            {[0.5, 1, 1.5, 2].map(rate => (
                              <button
                                key={rate}
                                onClick={() => {
                                  setPlaybackRate(rate);
                                  setShowSpeedMenu(false);
                                }}
                                className={`w-full px-4 py-2 text-xs text-left hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-red-500 font-bold' : 'text-white'}`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button className="text-white"><Settings size={20} /></button>
                    <button className="text-white"><PlaySquare size={20} /></button>
                    <button className="text-white"><Maximize size={20} /></button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-4">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{video.title}</h1>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-3">
              <img 
                src={video.channelAvatar} 
                alt={video.channelName} 
                className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity" 
                referrerPolicy="no-referrer" 
                onClick={() => onChannelClick(video.channelName)}
              />
              <div className="flex flex-col">
                <div 
                  className="flex items-center gap-1 font-bold text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onChannelClick(video.channelName)}
                >
                  {video.channelName}
                  <CheckCircle2 size={14} fill="currentColor" className="text-gray-500" />
                </div>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{video.subscribers} subscribers</span>
              </div>
              <button 
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={`ml-4 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  isSubscribed 
                    ? (darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900') 
                    : (darkMode ? 'bg-white text-black' : 'bg-black text-white')
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center rounded-full ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                <button 
                  onClick={() => onLike(video.id)}
                  className={`flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-l-full border-r border-white/10 ${isLiked ? 'text-blue-500' : ''}`}
                >
                  <ThumbsUp size={18} fill={isLiked ? "currentColor" : "none"} />
                  <span className="text-sm font-medium">{(video.likes / 1000).toFixed(1)}K</span>
                </button>
                <button className="px-4 py-2 hover:bg-white/5 rounded-r-full">
                  <ThumbsUp size={18} className="rotate-180" />
                </button>
              </div>
              <button 
                onClick={() => onWatchLater(video.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} ${isWatchLater ? 'text-blue-500' : ''}`}
              >
                <Clock size={18} fill={isWatchLater ? "currentColor" : "none"} />
                <span className="text-sm font-medium hidden sm:inline">Watch Later</span>
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <Share2 size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>
              <button 
                onClick={handleDownload}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isDownloaded 
                    ? 'text-blue-500 bg-blue-500/10' 
                    : (darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200')
                }`}
              >
                <Download size={18} />
                <span className="text-sm font-medium">{isDownloaded ? 'Downloaded' : 'Download'}</span>
              </button>
              <button className={`p-2 rounded-full ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Description Box */}
          <div className={`mt-4 p-3 rounded-xl text-sm ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className="flex gap-2 font-bold mb-1">
              <span>{video.views} views</span>
              <span>{video.postedAt}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {video.description}
            </p>
            <button className="mt-2 font-bold hover:underline">Show more</button>
          </div>

          {/* Comments Section */}
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-4">{comments.length} Comments</h3>
            <form onSubmit={handleAddComment} className="flex gap-4 mb-8">
              <img src="https://picsum.photos/seed/user/100/100" alt="User" className="w-10 h-10 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Add a comment..." 
                  className={`bg-transparent border-b ${darkMode ? 'border-white/20 focus:border-white' : 'border-gray-300 focus:border-black'} outline-none py-1 transition-colors`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setCommentText('')} className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-full">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={!commentText.trim()}
                    className={`px-4 py-2 text-sm font-medium rounded-full ${commentText.trim() ? 'bg-blue-600 text-white' : (darkMode ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400')}`}
                  >
                    Comment
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-4">
                  <img src={comment.userAvatar} alt={comment.userName} className="w-10 h-10 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{comment.userName}</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{comment.timestamp}</span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <button className="flex items-center gap-1 text-xs hover:bg-white/10 p-1 rounded">
                        <ThumbsUp size={14} />
                        {comment.likes > 0 && comment.likes}
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:bg-white/10 p-1 rounded">
                        <ThumbsUp size={14} className="rotate-180" />
                      </button>
                      <button className="text-xs font-bold hover:bg-white/10 px-2 py-1 rounded">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Sidebar */}
      <div className="lg:w-[400px] flex flex-col gap-4">
        <h2 className="font-bold text-lg">Up next</h2>
        {recommendedVideos.map(v => (
          <div 
            key={v.id} 
            className="flex gap-3 cursor-pointer group"
            onClick={() => onVideoSelect(v)}
          >
            <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 py-0.5 rounded">
                {v.duration}
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className={`text-sm font-bold line-clamp-2 leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {v.title}
              </h3>
              <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1 hover:text-white transition-colors">
                  {v.channelName}
                  <CheckCircle2 size={10} fill="currentColor" className="text-gray-500" />
                </div>
                <div>{v.views} views • {v.postedAt}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showShareModal && (
          <ShareModal 
            video={video} 
            onClose={() => setShowShareModal(false)} 
            darkMode={darkMode} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareModal({ video, onClose, darkMode }: { video: Video, onClose: () => void, darkMode: boolean }) {
  const [copied, setCopied] = useState(false);
  const videoUrl = `https://streamx.io/v/${video.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialPlatforms = [
    { name: 'WhatsApp', icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png', color: 'bg-[#25D366]' },
    { name: 'Facebook', icon: 'https://cdn-icons-png.flaticon.com/512/733/733547.png', color: 'bg-[#1877F2]' },
    { name: 'Twitter', icon: 'https://cdn-icons-png.flaticon.com/512/733/733579.png', color: 'bg-[#1DA1F2]' },
    { name: 'Reddit', icon: 'https://cdn-icons-png.flaticon.com/512/733/733626.png', color: 'bg-[#FF4500]' },
    { name: 'Email', icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png', color: 'bg-gray-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${darkMode ? 'bg-[#282828] text-white' : 'bg-white text-gray-900'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Share</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
          {socialPlatforms.map(platform => (
            <button 
              key={platform.name}
              className="flex flex-col items-center gap-2 min-w-[70px]"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center p-2.5 ${platform.color} hover:opacity-90 transition-opacity`}>
                <img src={platform.icon} alt={platform.name} className="w-full h-full invert brightness-0" />
              </div>
              <span className="text-xs font-medium">{platform.name}</span>
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <span className="text-sm truncate flex-1">{videoUrl}</span>
          <button 
            onClick={handleCopy}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsView({ darkMode, setDarkMode, setCurrentView }: { darkMode: boolean, setDarkMode: (v: boolean) => void, setCurrentView: (v: string) => void }) {
  const settingsGroups = [
    {
      title: 'Appearance',
      items: [
        { 
          icon: darkMode ? <Settings size={20} /> : <Settings size={20} />, 
          label: 'Dark theme', 
          description: darkMode ? 'On' : 'Off',
          action: () => setDarkMode(!darkMode)
        }
      ]
    },
    {
      title: 'General',
      items: [
        { icon: <Settings size={20} />, label: 'Playback speed', description: 'Normal' },
        { icon: <Settings size={20} />, label: 'Location', description: 'India' },
        { icon: <Settings size={20} />, label: 'Restricted Mode', description: 'Off' }
      ]
    },
    {
      title: 'About',
      items: [
        { icon: <Settings size={20} />, label: 'Help', description: '' },
        { icon: <Settings size={20} />, label: 'Send feedback', description: '' },
        { icon: <Settings size={20} />, label: 'Terms & Privacy Policy', description: '' }
      ]
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => setCurrentView('You')}
          className={`p-2 rounded-full ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className={`text-sm font-bold mb-4 px-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{group.title}</h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button 
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.icon}</div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.description && (
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardView({ user, videos, darkMode }: { user: UserType | null, videos: Video[], darkMode: boolean }) {
  const userVideos = videos.filter(v => v.channelName === user?.name);
  const totalViews = userVideos.reduce((acc, v) => {
    const views = parseInt(v.views.replace(/[^0-9]/g, '')) || 0;
    return acc + (v.views.includes('M') ? views * 1000000 : v.views.includes('K') ? views * 1000 : views);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-8">Channel dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current subscribers</h3>
          <div className="text-3xl font-bold">1,204</div>
          <div className="text-sm text-green-500 mt-2">+24 in last 28 days</div>
        </div>
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Views (last 28 days)</h3>
          <div className="text-3xl font-bold">{totalViews.toLocaleString()}</div>
          <div className="text-sm text-green-500 mt-2">+12% vs previous 28 days</div>
        </div>
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Watch time (hours)</h3>
          <div className="text-3xl font-bold">452.8</div>
          <div className="text-sm text-red-500 mt-2">-3% vs previous 28 days</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Your videos</h2>
      {userVideos.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                <th className="py-3 px-4 font-medium">Video</th>
                <th className="py-3 px-4 font-medium">Visibility</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Views</th>
                <th className="py-3 px-4 font-medium">Comments</th>
                <th className="py-3 px-4 font-medium">Likes</th>
              </tr>
            </thead>
            <tbody>
              {userVideos.map(video => (
                <tr key={video.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className="py-3 px-4 flex items-center gap-4">
                    <img src={video.thumbnail} alt={video.title} className="w-24 aspect-video object-cover rounded" />
                    <div className="font-medium max-w-[200px] truncate">{video.title}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 size={16} /> Public
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{video.postedAt}</td>
                  <td className="py-3 px-4 text-sm">{video.views}</td>
                  <td className="py-3 px-4 text-sm">0</td>
                  <td className="py-3 px-4 text-sm">{video.likes || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`p-12 text-center rounded-xl border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <PlaySquare size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">No videos yet</h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload a video to get started with your channel.</p>
        </div>
      )}
    </div>
  );
}

function YouView({ user, isLoggedIn, onLogin, onLogout, onSwitchAccount, darkMode, setCurrentView }: { user: UserType | null, isLoggedIn: boolean, onLogin: () => void, onLogout: () => void, onSwitchAccount: () => void, darkMode: boolean, setCurrentView: (v: string) => void }) {
  const menuItems = [
    { icon: <Clock size={22} />, label: 'History', view: 'History' },
    { icon: <PlaySquare size={22} />, label: 'Watch Later', view: 'WatchLater' },
    { icon: <PlaySquare size={22} />, label: 'Playlists', view: 'Library' },
    { icon: <Download size={22} />, label: 'Downloads', view: 'Downloads' },
    { icon: <ThumbsUp size={22} />, label: 'Liked videos', view: 'Liked' },
  ];

  const settingsItems = [
    { icon: <Settings size={22} />, label: 'Settings', view: 'Settings' },
    { icon: <LogOut size={22} />, label: isLoggedIn ? 'Sign out' : 'Sign in', action: isLoggedIn ? onLogout : onLogin },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {isLoggedIn ? (
        <div className="flex flex-col gap-8">
          {/* User Profile Header */}
          <div className="flex items-center gap-6">
            <img src={user?.avatar} alt={user?.name} className="w-20 h-20 md:w-24 md:h-24 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold">{user?.name}</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>@{user?.name.toLowerCase().replace(/\s/g, '')} • View channel</p>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={onSwitchAccount}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Switch account
                </button>
                <button 
                  onClick={() => window.open('https://myaccount.google.com/', '_blank')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Google Account
                </button>
              </div>
            </div>
          </div>

          {/* Main Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {menuItems.map((item) => (
              <button 
                key={item.label}
                onClick={() => setCurrentView(item.view)}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.icon}</div>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <hr className={`my-2 ${darkMode ? 'border-white/10' : 'border-gray-200'}`} />

          {/* Settings & Logout */}
          <div className="flex flex-col gap-2">
            {settingsItems.map((item) => (
              <button 
                key={item.label}
                onClick={item.action || (() => item.view && setCurrentView(item.view))}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.icon}</div>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User size={80} className="text-gray-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">Enjoy your favorite videos</h2>
          <p className="text-gray-500 mb-8 max-w-sm">Sign in to access your playlists, history, and more from any device.</p>
          <button 
            onClick={onLogin}
            className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}

function ShortsView({ shorts, darkMode }: { shorts: Video[], darkMode: boolean }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 h-[calc(100vh-56px)] overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {shorts.map((short) => (
        <div key={short.id} className="relative w-full max-w-[400px] h-[calc(100vh-100px)] min-h-[600px] snap-center rounded-2xl overflow-hidden bg-black flex-shrink-0">
          <video 
            src={short.videoUrl} 
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          
          {/* Overlay Content */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
          
          <div className="absolute bottom-0 left-0 right-16 p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <img src={short.channelAvatar} className="w-8 h-8 rounded-full" alt={short.channelName} />
              <span className="font-bold text-sm">{short.channelName}</span>
              <button className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold ml-2">Subscribe</button>
            </div>
            <p className="text-sm line-clamp-2">{short.title}</p>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-4 right-2 flex flex-col items-center gap-6 text-white">
            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-black/40 hover:bg-black/60">
                <ThumbsUp size={24} fill="currentColor" />
              </div>
              <span className="text-xs font-medium">{(short.likes / 1000).toFixed(0)}K</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-black/40 hover:bg-black/60">
                <ThumbsUp size={24} className="rotate-180" />
              </div>
              <span className="text-xs font-medium">Dislike</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-black/40 hover:bg-black/60">
                <Share2 size={24} />
              </div>
              <span className="text-xs font-medium">Share</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full bg-black/40 hover:bg-black/60">
                <MoreVertical size={24} />
              </div>
            </button>
            <img src={short.channelAvatar} className="w-10 h-10 rounded-md border-2 border-white mt-2" alt="Audio track" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryView({ history, videos, onVideoSelect, darkMode, onClearHistory }: { history: string[], videos: Video[], onVideoSelect: (v: Video) => void, darkMode: boolean, onClearHistory: () => void }) {
  const historyVideos = history
    .map(id => videos.find(v => v.id === id))
    .filter((v): v is Video => !!v);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Watch history</h1>
        {historyVideos.length > 0 && (
          <button 
            onClick={onClearHistory}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <X size={18} />
            Clear all watch history
          </button>
        )}
      </div>

      {historyVideos.length > 0 ? (
        <div className="flex flex-col gap-4">
          {historyVideos.map((video, index) => (
            <div 
              key={`${video.id}-${index}`}
              className={`flex flex-col md:flex-row gap-4 p-2 rounded-xl transition-colors cursor-pointer ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
              onClick={() => onVideoSelect(video)}
            >
              <div className="relative aspect-video w-full md:w-64 flex-shrink-0 rounded-lg overflow-hidden">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded">
                  {video.duration}
                </div>
              </div>
              <div className="flex flex-col py-1">
                <h3 className="font-bold line-clamp-2 mb-1">{video.title}</h3>
                <div className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{video.channelName}</span>
                  <span>•</span>
                  <span>{video.views} views</span>
                </div>
                <p className={`text-xs mt-2 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={80} className="text-gray-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">This list has no videos.</h2>
          <p className="text-gray-500 max-w-sm">When you watch videos, they'll appear here for you to revisit.</p>
        </div>
      )}
    </div>
  );
}

function LikedVideosView({ likedVideos, videos, onVideoSelect, darkMode, onRemove }: { likedVideos: string[], videos: Video[], onVideoSelect: (v: Video) => void, darkMode: boolean, onRemove: (id: string) => void }) {
  const liked = likedVideos
    .map(id => videos.find(v => v.id === id))
    .filter((v): v is Video => !!v);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ThumbsUp size={28} />
          Liked videos
        </h1>
      </div>

      {liked.length > 0 ? (
        <div className="flex flex-col gap-4">
          {liked.map(video => (
            <div 
              key={video.id} 
              className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl cursor-pointer group ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              onClick={() => onVideoSelect(video)}
            >
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover rounded-xl" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg line-clamp-2 mb-1 group-hover:text-blue-500 transition-colors">{video.title}</h3>
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{video.channelName}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {video.views} views • {video.postedAt}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(video.id);
                    }}
                    className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`}
                    title="Remove from Liked videos"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-12 text-center rounded-xl border ${darkMode ? 'bg-[#212121] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <ThumbsUp size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">No liked videos yet</h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Videos you like will show up here.</p>
          <button 
            onClick={() => window.location.reload()}
            className={`px-6 py-2 rounded-full font-bold ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            Explore videos
          </button>
        </div>
      )}
    </div>
  );
}

function WatchLaterView({ watchLater, videos, onVideoSelect, darkMode, onRemove }: { watchLater: string[], videos: Video[], onVideoSelect: (v: Video) => void, darkMode: boolean, onRemove: (id: string) => void }) {
  const watchLaterVideos = watchLater
    .map(id => videos.find(v => v.id === id))
    .filter((v): v is Video => !!v);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Watch Later</h1>
      </div>

      {watchLaterVideos.length > 0 ? (
        <div className="flex flex-col gap-4">
          {watchLaterVideos.map((video, index) => (
            <div 
              key={`${video.id}-${index}`}
              className={`flex flex-col md:flex-row gap-4 p-2 rounded-xl transition-colors cursor-pointer relative group ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
              onClick={() => onVideoSelect(video)}
            >
              <div className="relative aspect-video w-full md:w-64 flex-shrink-0 rounded-lg overflow-hidden">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded">
                  {video.duration}
                </div>
              </div>
              <div className="flex flex-col py-1 flex-1">
                <h3 className="font-bold line-clamp-2 mb-1">{video.title}</h3>
                <div className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{video.channelName}</span>
                  <span>•</span>
                  <span>{video.views} views</span>
                </div>
                <p className={`text-xs mt-2 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {video.description}
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(video.id);
                }}
                className={`absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600`}
                title="Remove from Watch Later"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PlaySquare size={80} className="text-gray-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">Your Watch Later list is empty</h2>
          <p className="text-gray-500 max-w-sm">Save videos to watch later and they'll appear here.</p>
        </div>
      )}
    </div>
  );
}

function ChannelView({ channelName, videos, darkMode, onVideoSelect }: { channelName: string, videos: Video[], darkMode: boolean, onVideoSelect: (v: Video) => void }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channel = {
    name: channelName,
    avatar: videos[0]?.channelAvatar || 'https://picsum.photos/seed/channel/100/100',
    banner: `https://picsum.photos/seed/${channelName}/1600/400`,
    subscribers: videos[0]?.subscribers || '0',
    description: `Official channel of ${channelName}. Subscribe for the latest updates and exclusive content.`,
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Channel Banner */}
      <div className="w-full aspect-[4/1] md:aspect-[6/1] bg-gray-800 overflow-hidden">
        <img src={channel.banner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>

      {/* Channel Header */}
      <div className="max-w-[1280px] mx-auto w-full px-4 md:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <img src={channel.avatar} alt={channel.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black/10" referrerPolicy="no-referrer" />
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{channel.name}</h1>
            <div className={`flex items-center gap-2 text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span>@{channel.name.toLowerCase().replace(/\s/g, '')}</span>
              <span>•</span>
              <span>{channel.subscribers} subscribers</span>
              <span>•</span>
              <span>{videos.length} videos</span>
            </div>
            <p className={`text-sm max-w-2xl mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {channel.description}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={`px-6 py-2 rounded-full font-bold transition-colors ${
                  isSubscribed 
                    ? (darkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900') 
                    : (darkMode ? 'bg-white text-black' : 'bg-black text-white')
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
              <button className={`px-6 py-2 rounded-full font-bold border ${darkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-50'}`}>
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className={`flex gap-8 mt-8 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          {['Home', 'Videos', 'Shorts', 'Playlists', 'Community', 'About'].map((tab, i) => (
            <button 
              key={tab} 
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                i === 0 
                  ? (darkMode ? 'border-white text-white' : 'border-black text-black') 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Channel Videos */}
        <div className="py-8">
          <h2 className="text-xl font-bold mb-6">Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onClick={() => onVideoSelect(video)} 
                onChannelClick={() => {}} // Already on channel page
                darkMode={darkMode} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
