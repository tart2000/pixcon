/** Gallery categories: each groups a few tags, with an icon to represent it. */
export const CATEGORIES = [
  { slug: "interface", label: "Interface", icon: "toggle-on", tags: ["interface", "computer", "edit"] },
  { slug: "symbols", label: "Math & Symbols", icon: "math-operations", tags: ["symbols", "math", "astronomical-sign", "shape", "justice"] },
  { slug: "nature", label: "Nature & Weather", icon: "leaf", tags: ["nature", "weather", "sky", "sea", "tree", "forest"] },
  { slug: "travel", label: "Maps & Transport", icon: "map", tags: ["transport", "vehicle", "city", "travel", "map", "road", "outdoors"] },
  { slug: "home", label: "Home & DIY", icon: "home", tags: ["home", "diy", "tool", "furniture", "clean", "garden", "bath"] },
  { slug: "media", label: "Media", icon: "music-note", tags: ["music", "sound", "film", "tv", "picture", "camera", "draw", "art"] },
  { slug: "food", label: "Food & Drink", icon: "hamburger", tags: ["food", "drink", "sweet", "fruit", "cook", "breakfast"] },
  { slug: "people", label: "People", icon: "person", tags: ["human", "face", "smiley", "body", "love"] },
  { slug: "tech", label: "Tech & Devices", icon: "laptop", tags: ["technology", "computer", "electricity", "signal"] },
  { slug: "parties", label: "Parties & Seasons", icon: "party-popper", tags: ["party", "halloween", "christmas", "holidays", "birthday", "summer", "winter"] },
  { slug: "animals", label: "Animals", icon: "cat", tags: ["animal", "insect", "bird"] },
  { slug: "fantasy", label: "Fantasy & Pop culture", icon: "dragon", tags: ["fantasy", "magic", "culture", "star-wars", "star-trek", "medieval", "minecraft", "one-piece", "pirate"] },
  { slug: "games", label: "Games & Toys", icon: "gamepad", tags: ["game", "play", "toy", "video-game", "cards"] },
  { slug: "money", label: "Money & Work", icon: "coins", tags: ["money", "pay", "shop", "buy", "work"] },
  { slug: "fashion", label: "Fashion", icon: "tshirt", tags: ["wear", "hat", "disguise"] },
  { slug: "brands", label: "Brands", icon: "github", tags: ["logo"] },
];

export type Category = (typeof CATEGORIES)[number];

/** A category's route, or the whole gallery's without one. */
export const categoryPath = (slug?: string | null) => (slug ? `/icons/categories/${slug}` : "/icons");

export const inCategory =(category: Category, alts: string[]) => alts.some((a) => category.tags.includes(a));
