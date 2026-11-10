export type Song = { id: string; title: string; artist: string | null; url: string };

export type Wish = {
  id: string;
  slug: string;
  user_id: string;
  recipient_name: string;
  birth_month: number;
  birth_day: number;
  timezone: string;
  default_image_url: string;
  default_message: string;
  song_id: string | null;
  custom_audio_url: string | null;
  is_disabled: boolean;
  view_count: number;
  created_at: string;
};

export type WishDay = {
  id: string;
  wish_id: string;
  date: string; // YYYY-MM-DD
  image_url: string | null;
  message: string | null;
};

/** What the public RPC returns: today's content only. */
export type PublicWish = {
  id: string;
  slug: string;
  recipient_name: string;
  birth_month: number;
  birth_day: number;
  timezone: string;
  today: string; // YYYY-MM-DD in the recipient's timezone, per the server
  image_url: string;
  message: string;
  default_image_url: string;
  is_scheduled_day: boolean;
  audio_url: string | null;
  song_title: string | null;
};
