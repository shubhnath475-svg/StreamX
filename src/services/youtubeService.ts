import { Video } from '../types';

const API_KEY = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const isApiKeyConfigured = !!API_KEY;

export async function getUserCountry(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'US';
  } catch (error) {
    console.error('Error fetching country:', error);
    return 'US';
  }
}

export async function searchVideos(query: string, regionCode: string = 'US'): Promise<Video[]> {
  if (!API_KEY) return [];

  try {
    const searchResponse = await fetch(
      `${BASE_URL}/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&regionCode=${regionCode}&key=${API_KEY}`
    );
    const searchData = await searchResponse.json();
    
    if (searchData.error) {
      console.error('YouTube API Error:', searchData.error);
      throw new Error(searchData.error.message || 'YouTube API Error');
    }
    
    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];
    
    return await getVideoDetails(videoIds);
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
}

export async function getTrendingVideos(regionCode: string = 'US'): Promise<Video[]> {
  if (!API_KEY) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=20&regionCode=${regionCode}&key=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.error) {
      console.error('YouTube API Error:', data.error);
      throw new Error(data.error.message || 'YouTube API Error');
    }
    
    if (!data.items || data.items.length === 0) return [];

    return await mapYouTubeItemsToVideos(data.items);
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return [];
  }
}

export async function fetchYouTubeHistory(accessToken: string): Promise<Video[]> {
  try {
    const response = await fetch('/api/youtube/history', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    const videoIds = data.items
      ?.filter((item: any) => item.snippet.type === 'upload' || item.snippet.type === 'watch')
      .map((item: any) => item.contentDetails?.upload?.videoId || item.contentDetails?.watch?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return [];
    
    return await getVideoDetails(videoIds);
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

async function getVideoDetails(videoIds: string): Promise<Video[]> {
  if (!videoIds) return [];
  const response = await fetch(
    `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'YouTube API Error');
  return await mapYouTubeItemsToVideos(data.items || []);
}

async function mapYouTubeItemsToVideos(items: any[]): Promise<Video[]> {
  if (!items || items.length === 0) return [];
  
  const channelIds = items.map((item: any) => item.snippet?.channelId).filter(Boolean).join(',');
  if (!channelIds) return [];
  
  const channelsResponse = await fetch(
    `${BASE_URL}/channels?part=snippet,statistics&id=${channelIds}&key=${API_KEY}`
  );
  const channelsData = await channelsResponse.json();
  if (channelsData.error) throw new Error(channelsData.error.message || 'YouTube API Error');
  
  const channelsMap = new Map((channelsData.items || []).map((c: any) => [c.id, c]));

  return items.map((item: any) => {
    const channel: any = channelsMap.get(item.snippet?.channelId);
    return {
      id: item.id || Math.random().toString(36).substring(7),
      title: item.snippet?.title || 'Unknown Title',
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || 'https://picsum.photos/seed/video/640/360',
      videoUrl: `https://www.youtube.com/embed/${item.id}`,
      channelName: item.snippet?.channelTitle || 'Unknown Channel',
      channelAvatar: channel?.snippet?.thumbnails?.default?.url || 'https://picsum.photos/seed/channel/100/100',
      views: formatViews(item.statistics?.viewCount),
      postedAt: formatDate(item.snippet?.publishedAt || new Date().toISOString()),
      duration: formatDuration(item.contentDetails?.duration),
      description: item.snippet?.description || '',
      category: 'YouTube',
      likes: parseInt(item.statistics?.likeCount || '0'),
      subscribers: formatViews(channel?.statistics?.subscriberCount)
    };
  });
}

function formatViews(views: string | undefined): string {
  if (!views) return '0';
  const num = parseInt(views);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Unknown date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown date';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

function formatDuration(duration: string | undefined): string {
  if (!duration) return '0:00';
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  let result = '';
  if (hours > 0) result += hours + ':';
  result += (hours > 0 && minutes < 10 ? '0' : '') + minutes + ':';
  result += (seconds < 10 ? '0' : '') + seconds;
  return result;
}
