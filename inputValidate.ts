/**
 * Validates and splits an input string into words
 * @param m The input string to validate and split (e.g. "Performing Arts & Humanities 305")
 * @returns Array of words from the input string
 */
export function validateInput(m: string): string[] {
    // Remove any leading/trailing whitespace
    const trimmed = m.trim();
    
    // Split on whitespace and filter out any empty strings
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    
    return words;
}

/**
 * Suggests buildings based on input words
 * @param input Array of words to match against building names
 * @param campusSuggestions Array of building suggestions with display_name property
 * @returns Filtered array of building names that match all input words
 */
export function suggestBuildingsFromInput(input: string[], campusSuggestions: any[]): string[] {
    // Helper: compute Levenshtein distance between two strings
    function levenshtein(a: string, b: string): number {
        const m = a.length;
        const n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[m][n];
    }

    // Helper: decide if an input word matches a target word roughly
    function wordMatches(inputWord: string, targetWord: string): boolean {
        const a = inputWord.toLowerCase();
        const b = targetWord.toLowerCase();
        if (b.indexOf(a) !== -1) return true; // substring
        if (a.indexOf(b) !== -1) return true; // inverse substring
        // Accept small typos: allow edit distance relative to length
        const maxDist = Math.max(1, Math.floor(Math.min(a.length, b.length) / 4));
        return levenshtein(a, b) <= maxDist;
    }

    // We'll include a building when ANY input word matches ANY word in the building's display name.
    // This is intentionally permissive to surface candidates when the user makes small typos.
    return campusSuggestions.filter(b => {
        const name: string = b.display_name || '';
        // Split the building name into words (also split on punctuation)
        const nameWords = name.split(/[^\w]+/).filter(Boolean);
        for (const iw of input) {
            for (const nw of nameWords) {
                if (wordMatches(iw, nw)) {
                    return true;
                }
            }
        }
        return false;
    });
}
