"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inputValidate_1 = require("../inputValidate");
// Example usage in your main app:
var userInput = "Engineering Building";
var words = (0, inputValidate_1.validateInput)(userInput);
var suggestions = (0, inputValidate_1.suggestBuildingsFromInput)(words, _campusSuggestions);
