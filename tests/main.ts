import { validateInput, suggestBuildingsFromInput } from '../inputValidate';

// If running this file standalone (node), there may not be a global
// `_campusSuggestions` variable. Declare it so TypeScript doesn't error,
// then provide a small fallback dataset so the script can run for testing.
const _campusSuggestions = [
  { display_name: 'Albin O. Kuhn Library & Gallery', lat: '39.2546', lon: '-76.7139' },
  { display_name: 'Engineering and Information Technology Building (EIT)', lat: '39.2529', lon: '-76.7139' },
  { display_name: 'Retriever Activities Center (RAC)', lat: '39.2542', lon: '-76.7164' },
  { display_name: 'University Center (UC)', lat: '39.2539', lon: '-76.7132' },
  { display_name: 'Fine Arts Building', lat: '39.2532', lon: '-76.7110' },
  { display_name: 'Performing Arts and Humanities Building (PAHB)', lat: '39.2537', lon: '-76.7122' },
  { display_name: 'Math/Psychology Building', lat: '39.2541', lon: '-76.7127' },
  { display_name: 'Biological Sciences Building', lat: '39.2547', lon: '-76.7117' },
  { display_name: 'Chemistry Building', lat: '39.2542', lon: '-76.7112' },
  { display_name: 'Physics Building', lat: '39.2540', lon: '-76.7107' },
  { display_name: 'Information Technology/Engineering (ITE)', lat: '39.2540', lon: '-76.7132' },
  { display_name: 'Public Policy Building', lat: '39.2552', lon: '-76.7132' },
  { display_name: 'Sondheim Hall', lat: '39.2545', lon: '-76.7122' },
  { display_name: 'Sherman Hall', lat: '39.2547', lon: '-76.7127' },
  { display_name: 'Administration Building', lat: '39.2547', lon: '-76.7132' },
  { display_name: 'The Commons', lat: '39.25515120000', lon: '-76.71133180000,' },
  { display_name: 'Patapsco Hall', lat: '39.2522', lon: '-76.7132' },
  { display_name: 'Potomac Hall', lat: '39.2522', lon: '-76.7142' },
  { display_name: 'Chesapeake Hall', lat: '39.2522', lon: '-76.7152' },
  { display_name: 'Susquehanna Hall', lat: '39.2522', lon: '-76.7162' },
  { display_name: 'Erickson Hall', lat: '39.2512', lon: '-76.7132' },
  { display_name: 'Harbor Hall', lat: '39.2512', lon: '-76.7142' },
  { display_name: 'Walker Avenue Apartments', lat: '39.2502', lon: '-76.7132' },
  { display_name: 'West Hill Apartments', lat: '39.2502', lon: '-76.7142' },
  { display_name: 'Hillside Apartments', lat: '39.2502', lon: '-76.7152' },
  { display_name: 'Center Road Apartments', lat: '39.2502', lon: '-76.7162' },
  { display_name: 'True Grits Dining Hall', lat: '39.2517', lon: '-76.7137' },
  { display_name: 'UMBC Event Center', lat: '39.2512', lon: '-76.7172' },
  { display_name: 'Potomac Parking Garage', lat: '39.2527', lon: '-76.7147' },
  { display_name: 'Administration Parking Garage', lat: '39.2552', lon: '-76.7137' },
  { display_name: 'Commons Garage', lat: '39.2547', lon: '-76.7142' },
  { display_name: 'Walker Avenue Garage', lat: '39.2507', lon: '-76.7137' },
  { display_name: 'Fine Arts Parking Lot', lat: '39.2532', lon: '-76.7102' },
  { display_name: 'PAHB Parking Lot', lat: '39.2537', lon: '-76.7117' },
  { display_name: 'UMBC Police', lat: '39.2557', lon: '-76.7132' },
  { display_name: 'UMBC Bookstore', lat: '39.2542', lon: '-76.7137' },
  { display_name: 'UMBC Stadium', lat: '39.2492', lon: '-76.7152' },
  { display_name: 'UMBC Technology Center', lat: '39.2562', lon: '-76.7102' },
  { display_name: 'bwtech@UMBC North', lat: '39.2572', lon: '-76.7102' },
  { display_name: 'bwtech@UMBC South', lat: '39.2472', lon: '-76.7152' }
];

const userInput = "Finn Art ";
const words = validateInput(userInput);

const suggestions = suggestBuildingsFromInput(words, _campusSuggestions);
console.log('Input Words:', words);
console.log('Suggestions:', suggestions);