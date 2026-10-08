import {
  faAlipay,
  faApple,
  faFacebook,
  faGithub,
  faGoogle,
  faLinkedin,
  faMicrosoft,
  faQq,
  faSlack,
  faTiktok,
  faTwitter,
  faVk,
  faWeibo,
  faWeixin,
  faYandex,
} from '@fortawesome/free-brands-svg-icons';
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { SSOProvider } from '@/services/auth/sso.dto';

export type ProviderMeta = { label: string; icon: IconDefinition; brandColor?: string };

// Third-party brand marks keep their brand color (Google); monochrome marks follow the text token.
// Providers FontAwesome has no mark for (autodesk) get a neutral sign-in icon.
export const SSO_PROVIDER_META: Record<SSOProvider, ProviderMeta> = {
  google: { label: 'Google', icon: faGoogle, brandColor: '#ea4335' },
  apple: { label: 'Apple', icon: faApple },
  facebook: { label: 'Facebook', icon: faFacebook, brandColor: '#1877f2' },
  github: { label: 'GitHub', icon: faGithub },
  linkedin: { label: 'LinkedIn', icon: faLinkedin, brandColor: '#0a66c2' },
  microsoft: { label: 'Microsoft', icon: faMicrosoft },
  twitter: { label: 'X', icon: faTwitter },
  slack: { label: 'Slack', icon: faSlack },
  tiktok: { label: 'TikTok', icon: faTiktok },
  wechat: { label: 'WeChat', icon: faWeixin, brandColor: '#07c160' },
  autodesk: { label: 'Autodesk', icon: faRightToBracket },
  yandex: { label: 'Yandex', icon: faYandex },
  vk: { label: 'VK', icon: faVk, brandColor: '#0077ff' },
  qq: { label: 'QQ', icon: faQq },
  weibo: { label: 'Weibo', icon: faWeibo, brandColor: '#e6162d' },
  alipay: { label: 'Alipay', icon: faAlipay, brandColor: '#1677ff' },
};
