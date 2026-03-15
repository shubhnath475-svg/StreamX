export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  postedAt: string;
  duration: string;
  description: string;
  category: string;
  likes: number;
  subscribers: string;
}

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  banner: string;
  subscribers: string;
  description: string;
  videos: Video[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscriptions: string[]; // channel names or IDs
  likedVideos: string[]; // video IDs
  history: string[]; // video IDs
  watchLater: string[]; // video IDs
}
