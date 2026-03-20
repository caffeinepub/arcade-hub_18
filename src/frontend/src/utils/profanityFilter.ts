// Profanity filter utility - censors common cuss words with asterisks
const BAD_WORDS = [
  "fuck",
  "fuck",
  "fuk",
  "f u c k",
  "shit",
  "sh1t",
  "sht",
  "bitch",
  "b1tch",
  "btch",
  "ass",
  "a55",
  "asshole",
  "a55hole",
  "bastard",
  "damn",
  "damm",
  "crap",
  "hell",
  "cunt",
  "c u n t",
  "dick",
  "d1ck",
  "cock",
  "c0ck",
  "penis",
  "p3nis",
  "pussy",
  "pu55y",
  "whore",
  "wh0re",
  "slut",
  "sl0t",
  "nigger",
  "n1gger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "piss",
  "twat",
  "wanker",
  "bollocks",
  "bloody",
  "arse",
  "kike",
  "spic",
  "chink",
  "bitch",
];

function censorWord(word: string): string {
  if (word.length <= 1) return word;
  if (word.length === 2) return `${word[0]}*`;
  return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
}

export function filterProfanity(text: string): string {
  if (!text) return text;
  let result = text;
  for (const bad of BAD_WORDS) {
    // Match whole word, case-insensitive
    const regex = new RegExp(
      `\\b${bad.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`,
      "gi",
    );
    result = result.replace(regex, (match) => censorWord(match));
  }
  return result;
}
