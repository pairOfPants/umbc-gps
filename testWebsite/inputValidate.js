"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInput = validateInput;
exports.suggestBuildingsFromInput = suggestBuildingsFromInput;
/**
 * Validates and splits an input string into words
 * @param m The input string to validate and split (e.g. "Performing Arts & Humanities 305")
 * @returns Array of words from the input string
 */
function validateInput(m) {
    // Remove any leading/trailing whitespace
    var trimmed = m.trim();
    // Split on whitespace and filter out any empty strings
    var words = trimmed.split(/\s+/).filter(function (word) { return word.length > 0; });
    return words;
}
/**
 * Suggests buildings based on input words
 * @param input Array of words to match against building names
 * @param campusSuggestions Array of building suggestions with display_name property
 * @returns Filtered array of building names that match all input words
 */
function suggestBuildingsFromInput(input, campusSuggestions) {
    var buildingSuggestions = campusSuggestions.map(function (b) { return b.display_name; });
    var _loop_1 = function (word) {
        // Use indexOf instead of includes to avoid depending on newer lib settings
        var w = word.toLowerCase();
        buildingSuggestions = buildingSuggestions.filter(function (building) {
            return building.toLowerCase().indexOf(w) !== -1;
        });
    };
    for (var _i = 0, input_1 = input; _i < input_1.length; _i++) {
        var word = input_1[_i];
        _loop_1(word);
    }
    return buildingSuggestions;
}
