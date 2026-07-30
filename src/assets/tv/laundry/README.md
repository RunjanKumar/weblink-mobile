# Garment images (TV laundry rate list)

One image per garment KIND, shown on the laundry rate-list tiles, in the cart and
on the order-history rows. Wired in
`src/screens/Laundry/components/GarmentImages.tsx`.

## What these files are

Rendered in-house (SVG → 512×512 transparent PNG), **not photographs and not
taken off the web**. Two reasons:

- **They have to read as a set.** Five tiles sit side by side; a dozen stock
  photos at different angles, crops and white balances look like a broken grid,
  while one palette + one light direction + one hanger reads as a catalogue.
- **Licence.** Nothing here carries someone else's copyright, which images pulled
  from a search engine would in a product a hotel pays for.

Treat them as a good placeholder for real photography. The generator lives in the
session scratchpad, not the repo — to change the look, re-render and replace the
files; nothing in `src/` needs editing.

## Replacing them with real photos

Same filenames, and match these or the tiles will look wrong:

| | |
|---|---|
| Format | PNG with a **transparent** background |
| Size | square, 512×512 or larger (renders at ~72 CSS px under `zoom: 1.5`) |
| Subject | the garment on a wooden hanger, centred, hook included |
| Background | **transparent — not white.** The tile is frosted glass over a photo; a white plate reads as a rendering bug |
| Padding | a few percent of margin so the hook is not clipped |

## When the backend serves images

The guest rate-list response (`GET /v1/laundry/guest/rate-list`) currently returns
`_id, unit, sortOrder, name, rates` and **no image field**. When one is added,
prefer it in `GarmentImages.tsx` and keep this map as the default — per-hotel
photography beats a shared set, since the rate list is already hotel-configurable.

## Filenames

Named after the garment kind, not the hotel's wording: the rate list is free text,
and `garmentIconFor()` (`GarmentIcons.tsx`) maps whatever it says onto one of
these. So `shirt.png` serves "Shirt", "Formal Shirt" and "Blouse" alike.

| file | matches (rate-list text) |
|---|---|
| `shirt.png` | Shirt, Blouse, Top |
| `tshirt.png` | T-Shirt, Tee |
| `polo.png` | Polo Shirt |
| `trouser.png` | Trouser, Pant, Chino, Pyjama |
| `jeans.png` | Jeans, Denim |
| `shorts.png` | Shorts |
| `dress.png` | Dress, Gown, Skirt |
| `blazer.png` | Blazer, Coat, Jacket, Suit |
| `sweater.png` | Sweater, Jumper, Hoodie, Cardigan |
| `kurta.png` | Kurta, Kurti, Sherwani |
| `saree.png` | Saree, Dupatta, Stole |
| `towel.png` | Towel, Bathrobe |
| `linen.png` | Bed sheet, Duvet, Pillow cover |
| `socks.png` | Socks, Undergarments, Innerwear |
| `hanger.png` | **fallback** — anything the name matcher cannot place |

The Figma frame shows ten of these (shirt, tshirt, trouser, jeans, shorts, polo,
dress, blazer, sweater, kurta). The dev hotel's live rate list is a different
nine — Shirt, T-Shirt, Trouser, Kurta, Saree, Dress, Blazer/Coat, Undergarments,
Socks (pair) — which is why `saree.png` and `socks.png` exist even though the
mockup has no shot of them, and why `jeans/shorts/polo/sweater` will not appear on
that hotel until its admin adds those garments.
