/**
 * Curated bring-list icon registry.
 *
 * Each entry maps a stable string id (stored in BringItem.icon) to the
 * lucide-react component name. The admin's IconPicker shows `suggested`
 * upfront and lazily loads the full lucide library only when the user
 * opens "More from library" or types in the search box.
 */

export type BringIconEntry = {
  /** Stable id stored on BringItem.icon (e.g. "Backpack"). */
  id: string;
  /** Search label / aria-label, in German since the audience is German-speaking. */
  label: string;
  /** Extra search keywords to broaden matches in the picker. */
  keywords: string[];
};

/**
 * Suggested icons — always rendered upfront in the picker, hand-picked
 * for scout activities. These are the names of lucide-react components.
 */
export const suggestedBringIcons: BringIconEntry[] = [
  { id: "Backpack", label: "Rucksack", keywords: ["bag", "tasche"] },
  { id: "Droplet", label: "Trinkflasche", keywords: ["water", "wasser", "flasche"] },
  { id: "Footprints", label: "Wanderschuhe", keywords: ["shoes", "schuhe"] },
  { id: "CloudRain", label: "Regenjacke", keywords: ["rain", "regen", "jacke"] },
  { id: "Shirt", label: "Kleidung", keywords: ["clothes", "kleider"] },
  { id: "Sandwich", label: "Znüni", keywords: ["food", "essen", "lunch"] },
  { id: "Apple", label: "Snack", keywords: ["food", "obst"] },
  { id: "Flashlight", label: "Stirnlampe", keywords: ["torch", "lampe", "headlamp"] },
  { id: "Tent", label: "Zelt", keywords: ["camping", "lager"] },
  { id: "Bed", label: "Schlafsack", keywords: ["sleeping", "schlafen"] },
  { id: "Compass", label: "Kompass", keywords: ["navigation"] },
  { id: "Map", label: "Karte", keywords: ["navigation"] },
  { id: "Pencil", label: "Stift", keywords: ["pen", "schreiben"] },
  { id: "BookOpen", label: "Notizbuch", keywords: ["book", "buch"] },
  { id: "Clock", label: "Uhr", keywords: ["watch", "zeit"] },
  { id: "Sun", label: "Sonnenschutz", keywords: ["sonne", "sunscreen"] },
  { id: "Glasses", label: "Sonnenbrille", keywords: ["glasses", "brille"] },
  { id: "Snowflake", label: "Warme Kleidung", keywords: ["winter", "kalt", "cold"] },
  { id: "Pill", label: "Medikamente", keywords: ["medicine", "medizin"] },
  { id: "BriefcaseMedical", label: "Erste Hilfe", keywords: ["first aid", "verband"] },
  { id: "IdCard", label: "Ausweis", keywords: ["id", "identity"] },
  { id: "Wallet", label: "Portemonnaie", keywords: ["money", "geld"] },
  { id: "Ticket", label: "Billet", keywords: ["ticket", "fahrkarte"] },
  { id: "KeyRound", label: "Schlüssel", keywords: ["key", "schluessel"] },
];

/** Quick lookup map for the renderer. */
export const suggestedBringIconsById: Record<string, BringIconEntry> =
  Object.fromEntries(suggestedBringIcons.map((i) => [i.id, i]));
