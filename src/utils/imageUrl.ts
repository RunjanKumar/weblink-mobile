import {config} from '../constants/config';
import {logger} from '../services/logger';

let warnedOnce = false;

/**
 * Resolve an API image reference to a loadable URL.
 *
 * The backend stores images as RELATIVE storage paths, not URLs — verified
 * against the live dev API on 2026-07-28:
 *
 *   "imageURL": "6a1937…/food/Chocolate_Lava_Cake_1780903181231.jfif"
 *
 * `<Image source={{uri}}>` cannot load that on any platform (native has no
 * base to resolve against; web resolves against the app origin, which on the
 * TV is file://), which is why the admin panel showed photos while the app
 * showed none — the admin prefixes its own asset host.
 *
 * The prefix lives in `.env` as IMAGE_BASE_URL. Absolute http(s)/data URIs
 * pass through untouched, so a future backend that returns full URLs keeps
 * working with no code change.
 */
export function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }
  if (!config.imageBaseUrl) {
    if (!warnedOnce) {
      warnedOnce = true;
      logger.warn(
        'imageUrl',
        `relative image path "${path.slice(0, 60)}" but IMAGE_BASE_URL is not set — images will not render`,
      );
    }
    return undefined;
  }
  return `${config.imageBaseUrl}/${path.replace(/^\/+/, '')}`;
}
