const version = await import("../../package.json").then((pkg) => pkg.version);
const languages = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ja: "Japanese",
  ru: "Russian",
  hi: "Hindi",
  ar: "Arabic",
  pt: "Portuguese",
  in: "Indonesian",
  bn: "Bengali",
  pa: "Punjabi",
};

// Alphabets and special letters for Latin-based languages
const alphabets = {
  en: "abcdefghijklmnopqrstuvwxyz",        // English base
  es: "abcdefghijklmnñopqrstuvwxyz",        // Spanish includes ñ
  fr: "abcdefghijklmnopqrstuvwxyz",        // French uses same 26, accents exist but base letters are same
  de: "abcdefghijklmnopqrstuvwxyzäöüß",    // German base + umlauts + ß
  pt: "abcdefghijklmnopqrstuvwxyz",        // Portuguese uses 26 plus accents (handled by normalization)
  in: "abcdefghijklmnopqrstuvwxyz",        // Indonesian uses simple 26-letter Latin alphabet
  // placeholders for non-latin scripts
  zh: null,
  ja: null,
  ru: null,
  hi: null,
  ar: null,
  bn: null,
  pa: null
};




export { version, languages };
