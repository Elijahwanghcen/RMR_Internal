// ════════════════════════════════════════════════════════════════
// RMR Known Addresses Database
// ════════════════════════════════════════════════════════════════
//
// HOW TO ADD A NEW ADDRESS:
//   1. Copy the template line at the bottom of this array
//   2. Fill in: canonical_name, area, property_type, lat, lng, aliases
//   3. Save this file
//   4. Click the "↻ Reload Data" button in the dashboard header
//      (or just refresh the browser tab)
//
// AREAS:  west_campus | north_campus | riverside | east_campus | north_loop | hancock | clarksville
// TYPES:  apartment | condo | condominium | co_op | coop | greek_housing
// ════════════════════════════════════════════════════════════════
const APARTMENT_DATA = [
    // WEST CAMPUS - The Block
    { canonical_name: "The Block on 25th East", area: "west_campus", property_type: "apartment", lat: 30.2896, lng: -97.7452, aliases: ["Block 25 East", "Block 25th E", "Block 25E"] },
    { canonical_name: "The Block on 25th West", area: "west_campus", property_type: "apartment", lat: 30.2896, lng: -97.7459, aliases: ["Block 25 West", "Block 25th W", "Block 25W"] },
    { canonical_name: "The Block on 28th", area: "west_campus", property_type: "apartment", lat: 30.2933, lng: -97.7446, aliases: ["Block 28", "Block Twenty Eight"] },
    { canonical_name: "The Block on Pearl North", area: "west_campus", property_type: "apartment", lat: 30.2896, lng: -97.7462, aliases: ["Block Pearl North", "Block Pearl N"] },
    { canonical_name: "The Block on Pearl South", area: "west_campus", property_type: "apartment", lat: 30.2856, lng: -97.7467, aliases: ["Block Pearl South", "Block Pearl S"] },
    // WEST CAMPUS - Quarters
    { canonical_name: "Quarters on Campus – Grayson", area: "west_campus", property_type: "apartment", lat: 30.2856, lng: -97.7463, aliases: ["Quarters Grayson", "Grayson House", "Grayson"] },
    { canonical_name: "Quarters on Campus – Rio", area: "west_campus", property_type: "apartment", lat: 30.2865, lng: -97.7457, aliases: ["Quarters Rio"] },
    { canonical_name: "Quarters on Campus – Nueces", area: "west_campus", property_type: "apartment", lat: 30.2868, lng: -97.7439, aliases: ["Quarters Nueces"] },
    { canonical_name: "Quarters on Campus – 26th", area: "west_campus", property_type: "apartment", lat: 30.2865, lng: -97.7457, aliases: ["Quarters 26th", "Quarters Twenty Sixth"] },
    { canonical_name: "Quarters on Campus – 28th", area: "west_campus", property_type: "apartment", lat: 30.2932, lng: -97.7435, aliases: ["Quarters 28th", "Quarters Twenty Eighth"] },
    { canonical_name: "Quarters on Campus – Karnes House", area: "west_campus", property_type: "apartment", lat: 30.2863, lng: -97.7457, aliases: ["Quarters Karnes", "Karnes House", "Karnes"] },
    { canonical_name: "Quarters on Campus – Sterling House", area: "west_campus", property_type: "apartment", lat: 30.2849, lng: -97.7461, aliases: ["Quarters Sterling", "Sterling House", "Sterling"] },
    // WEST CAMPUS - Other Major Apartments
    { canonical_name: "26 West", area: "west_campus", property_type: "apartment", lat: 30.2911, lng: -97.7435, aliases: ["26West"] },
    { canonical_name: "2400 Nueces", area: "west_campus", property_type: "apartment", lat: 30.2885, lng: -97.7434, aliases: ["2400 Nueces Apartments"] },
    { canonical_name: "21 Rio", area: "west_campus", property_type: "apartment", lat: 30.2843, lng: -97.7447, aliases: ["Twenty One Rio"] },
    { canonical_name: "22 Rio", area: "west_campus", property_type: "apartment", lat: 30.2850, lng: -97.7447, aliases: ["Twenty Two Rio"] },
    { canonical_name: "Dobie Twenty21", area: "west_campus", property_type: "apartment", lat: 30.2834, lng: -97.7412, aliases: ["Dobie", "Dobie 21", "Dobie Twenty One"] },
    { canonical_name: "Crest at Pearl", area: "west_campus", property_type: "apartment", lat: 30.2833, lng: -97.7465, aliases: ["Crest Pearl"] },
    { canonical_name: "Villas on Guadalupe", area: "west_campus", property_type: "apartment", lat: 30.2938, lng: -97.7415, aliases: ["Villas Guadalupe"] },
    { canonical_name: "The Castilian", area: "west_campus", property_type: "apartment", lat: 30.2873, lng: -97.7424, aliases: ["Castilian"] },
    { canonical_name: "Skyloft Austin", area: "west_campus", property_type: "apartment", lat: 30.2862, lng: -97.7435, aliases: ["Skyloft"] },
    { canonical_name: "The Standard", area: "west_campus", property_type: "apartment", lat: 30.2869, lng: -97.7458, aliases: ["Standard Austin"] },
    { canonical_name: "Callaway House", area: "west_campus", property_type: "apartment", lat: 30.2848, lng: -97.7434, aliases: ["Callaway", "The Callaway"] },
    { canonical_name: "Rambler Apartments", area: "west_campus", property_type: "apartment", lat: 30.2902, lng: -97.7431, aliases: ["Rambler ATX", "Rambler", "Rambler Apartments"] },
    { canonical_name: "The Sinclair", area: "west_campus", property_type: "apartment", lat: 30.29287, lng: -97.74293, aliases: ["The Sinclair Austin", "Sinclair Apartments", "2710 Nueces St"] },
    { canonical_name: "The Sondery", area: "east_riverside", property_type: "apartment", lat: 30.23673, lng: -97.72677, aliases: ["Sondery Apartments", "The Sondery Austin", "Sondery", "1700 Willow Creek Dr"] },
    { canonical_name: "Marq on Burnet", area: "allandale", property_type: "apartment", lat: 30.34191, lng: -97.73844, aliases: ["The Marq on Burnet", "Marq Burnet", "6725 Burnet Rd"] },
    // WEST CAMPUS - Condominium Clusters
    { canonical_name: "Vanderbilt Condominiums", area: "west_campus", property_type: "condo", lat: 30.2857, lng: -97.7476, aliases: ["Vanderbilt", "Vanderbilt Condos"] },
    { canonical_name: "Texan Shoal Creek Condominiums", area: "west_campus", property_type: "condo", lat: 30.2900, lng: -97.7498, aliases: ["Texan Shoal Creek", "Texan Condos"] },
    { canonical_name: "Escala Condominiums", area: "west_campus", property_type: "condo", lat: 30.2911, lng: -97.7478, aliases: ["Escala"] },
    { canonical_name: "Montage Apartments", area: "west_campus", property_type: "apartment", lat: 30.2946, lng: -97.7444, aliases: ["Montage West Campus", "Montage Austin", "Montage"] },
    { canonical_name: "The Nine at West Campus", area: "west_campus", property_type: "apartment", lat: 30.2911, lng: -97.7490, aliases: ["The Nine", "The Nine West Campus", "2518 Leon St"] },
    { canonical_name: "1883 at Cameron House", area: "west_campus", property_type: "apartment", lat: 30.2925, lng: -97.7438, aliases: ["Cameron House", "The Quarters - Cameron House", "1883 Cameron", "2707 Rio Grande"] },
    { canonical_name: "The Block 23", area: "west_campus", property_type: "apartment", lat: 30.2872, lng: -97.7466, aliases: ["The Block 23", "Block 23", "23rd & Pearl", "2222 Pearl St", "The Block on 23rd", "Block on 23rd"] },
    { canonical_name: "Dos Rios", area: "west_campus", property_type: "condominium", lat: 30.2948, lng: -97.7427, aliases: ["Dos Rios", "Dos Rios Apartments", "2818 Nueces"] },
    { canonical_name: "Tower View Apartments", area: "north_campus", property_type: "apartment", lat: 30.28854, lng: -97.72706, aliases: ["Tower View", "926 E Dean Keeton", "Tower View Condos"] },
    { canonical_name: "Treehouse Condominiums", area: "west_campus", property_type: "condominium", lat: 30.29248, lng: -97.74606, aliases: ["Treehouse Condos", "Tree House Condominiums", "2612 San Pedro St"] },
    { canonical_name: "Pecan Square Apartments", area: "north_university", property_type: "apartment", lat: 30.30204, lng: -97.73801, aliases: ["Pecan Square", "Pecan Square Apartments - Hyde Park", "506 W 37th St", "507 W 37th St"] },
    // WEST CAMPUS - Fringe / Small Condo Clusters
    { canonical_name: "Landmark Square", area: "west_campus", property_type: "condo", lat: 30.2856, lng: -97.7456, aliases: ["Landmark Place", "Landmark Condos", "Landmark Place Condominiums"] },
    { canonical_name: "Piazza Navona Condominiums", area: "west_campus", property_type: "condo", lat: 30.2905, lng: -97.7455, aliases: ["Piazza Navona", "Navona Condos"] },
    { canonical_name: "Greenwood Condominiums", area: "west_campus", property_type: "condo", lat: 30.2805, lng: -97.7411, aliases: ["Greenwood Condos"] },
    { canonical_name: "Seton Square Condominiums", area: "west_campus", property_type: "condo", lat: 30.2878, lng: -97.7441, aliases: ["Seton Square"] },
    { canonical_name: "Oak Grove Apartments", area: "west_campus", property_type: "condo", lat: 30.2298, lng: -97.7669, aliases: ["Oak Grove"] },
    { canonical_name: "West Campus Flats", area: "west_campus", property_type: "apartment", lat: 30.28496, lng: -97.74853, aliases: ["West Campus Flats Austin", "2104 San Gabriel", "San Gabriel Flats"] },
    { canonical_name: "1907 Robbins Place Apartments", area: "west_campus", property_type: "apartment", lat: 30.28449, lng: -97.74908, aliases: ["1907 Robbins Place", "Robbins Place Apartments", "1907 Robbins Pl"] },
    { canonical_name: "Lantern Lane Condominiums", area: "west_campus", property_type: "apartment", lat: 30.28338, lng: -97.74330, aliases: ["Lantern Lane", "Lantern Lane Austin", "2008 San Antonio St"] },
    { canonical_name: "Littlefield Apartments", area: "west_campus", property_type: "apartment", lat: 30.29120, lng: -97.74451, aliases: ["Littlefield", "Littlefield West Campus", "2506 Rio Grande", "Littlefield Apts"] },
    { canonical_name: "Galileo Condominiums", area: "west_campus", property_type: "condominium", lat: 30.28983, lng: -97.74746, aliases: ["Galileo Austin", "Galileo Condos", "910 W 25th St", "The Galileo"] },
    { canonical_name: "Avon at 22nd", area: "west_campus", property_type: "apartment", lat: 30.28533, lng: -97.74770, aliases: ["Avon at 22nd Apartments", "910 W 22nd St", "Avon Apartments"] },
    { canonical_name: "The Marian Condominiums", area: "west_campus", property_type: "condominium", lat: 30.29278, lng: -97.74554, aliases: ["The Marian", "Marian Condos", "2704 Salado St"] },
    { canonical_name: "Arrakis Co-op", area: "west_campus", property_type: "co-op_housing", lat: 30.28677, lng: -97.74662, aliases: ["Arrakis", "Arrakis Cooperative", "2212 San Gabriel St"] },
    { canonical_name: "French House Co-op", area: "west_campus", property_type: "co-op_housing", lat: 30.28441, lng: -97.74606, aliases: ["French House", "La Maison Française", "700 W 21st St"] },
    { canonical_name: "9HUNDRED", area: "west_campus", property_type: "apartment", lat: 30.28773, lng: -97.74693, aliases: ["900 West", "9hundred", "9 Hundred", "900 W 23rd St", "Apartment 9HUNDRED"] },
    { canonical_name: "West Campus Elloras", area: "west_campus", property_type: "apartment", lat: 30.28494, lng: -97.74753, aliases: ["The Elloras", "Ellora Apartments", "914 W 22nd St", "West Campus Ellora"] },
    { canonical_name: "Casa De Salado", area: "west_campus", property_type: "condominium", lat: 30.29204, lng: -97.74580, aliases: ["Casa de Salado Condos", "2612 Salado St", "Salado West Campus"] },
    { canonical_name: "Gables Condominiums", area: "west_campus", property_type: "condominium", lat: 30.28253, lng: -97.74516, aliases: ["Gables Condos", "700 W 19th St", "The Gables Austin"] },
    { canonical_name: "Penthouse Apartments", area: "west_campus", property_type: "apartment", lat: 30.28114, lng: -97.74474, aliases: ["Penthouse Rio Grande", "1801 Rio Grande St", "Penthouse ATX"] },
    // East Campus
    { canonical_name: "San Pedro Flats", area: "east_campus", property_type: "condominium", lat: 30.29330, lng: -97.74591, aliases: ["San Pedro Flats Condos", "2708 San Pedro", "2708 San Pedro St"] },
    { canonical_name: "Speedway Condominiums", area: "east_campus", property_type: "condominium", lat: 30.2935, lng: -97.7351, aliases: ["Speedway Condos", "305 E 31st", "Speedway Condos Austin"] },
    { canonical_name: "Tom Green Condominiums", area: "east_campus", property_type: "condominium", lat: 30.29575, lng: -97.73379, aliases: ["Tom Green Condos", "3115 Tom Green St", "Tom Green Apartments"] },
    { canonical_name: "Point North", area: "north_campus", property_type: "condominium", lat: 30.29203, lng: -97.73463, aliases: ["Point North Condos", "2911 Speedway", "Point North Apartments"] },
    { canonical_name: "Aura Thirty2", area: "hancock", property_type: "apartment", lat: 30.29110, lng: -97.72355, aliases: ["Aura 32", "Aura Thirty Two", "3215 North I-35", "Aura 32nd"] },
    // Where in the world??
    { canonical_name: "Troubadour", area: "hancock", property_type: "apartment", lat: 30.29278, lng: -97.72213, aliases: ["Troubadour Austin", "Troubadour Apartments", "3403 Harmon Ave"] },
    { canonical_name: "Presidium Tech Ridge Apartments", area: "tech_ridge", property_type: "apartment", lat: 30.39963, lng: -97.67111, aliases: ["Presidium Tech Ridge", "12210 Tech Ridge Blvd"] },
    { canonical_name: "High Point Preserve", area: "northeast_austin", property_type: "apartment", lat: 30.32847, lng: -97.64564, aliases: ["High Point Preserve Apartments", "9301 US-290", "High Point Preserve Austin"] },
    { canonical_name: "The Waller", area: "downtown", property_type: "apartment", lat: 30.27136, lng: -97.73450, aliases: ["The Waller Apartments", "1104 Red River St", "Waller ATX"] },
    { canonical_name: "Promontory Point", area: "east_riverside", property_type: "apartment", lat: 30.33048, lng: -97.67611, aliases: ["Promontory Point Apartments", "1501 S-I35", "Promontory Point Austin"] },
    { canonical_name: "Hillside Creek", area: "east_riverside", property_type: "apartment", lat: 30.23412, lng: -97.73799, aliases: ["Hillside Creek Apartments", "1730 E Oltorf St", "Hillside Creek Austin"] },
    { canonical_name: "Texas Wranglers House", area: "west_campus", property_type: "student_org_housing", lat: 30.29452, lng: -97.74376, aliases: ["Wrangler House", "The Wrangler Mansion", "2800 Rio Grande St"] },
    { canonical_name: "Pecan Walks", area: "north_university", property_type: "condominium", lat: 30.30025, lng: -97.73431, aliases: ["Pecan Walk Condos", "Pecan Walk Townhomes", "3503 Speedway"] },
    { canonical_name: "Keystone Apartments", area: "northwest_austin", property_type: "apartment", lat: 30.41704, lng: -97.74367, aliases: ["Keystone", "Keystone Austin", "5430 W Braker Ln"] },
    { canonical_name: "Preserve at Wells Branch", area: "wells_branch", property_type: "apartment", lat: 30.44412, lng: -97.67446, aliases: ["Preserve at Wells Branch Apartments", "1773 Wells Branch Pkwy", "Preserve at Wells"] },
    { canonical_name: "Oaks at Chisholm Trail", area: "round_rock", property_type: "apartment", lat: 30.54831, lng: -97.69536, aliases: ["The Oaks at Chisholm Trail", "Oaks Chisholm Trail", "610 Chisholm Trail Rd"] },
    { canonical_name: "Redpoint San Marcos", area: "san_marcos", property_type: "student_housing", lat: 29.94654, lng: -97.93780, aliases: ["Redpoint", "The Woods San Marcos", "650 River Rd"] },
    { canonical_name: "VEER Apartments", area: "georgian_acres", property_type: "apartment", lat: 30.34450, lng: -97.70319, aliases: ["Veer Apartments", "Veer Austin", "7928 Gessner Dr"] },
    // NORTH CAMPUS - Apartments
    { canonical_name: "San Gabriel Square", area: "north_campus", property_type: "apartment", lat: 30.2865, lng: -97.7487, aliases: [] },
    { canonical_name: "Duval Villas", area: "north_campus", property_type: "apartment", lat: 30.3349, lng: -97.7076, aliases: ["Duval lofts"] },
    { canonical_name: "3000 Guadalupe St", area: "north_university", property_type: "mixed-use/apartment", lat: 30.29716, lng: -97.74232, aliases: ["3000 Guadalupe"] },
    // NORTH CAMPUS - Condominium Clusters
    { canonical_name: "Orange Tree Condominiums", area: "north_campus", property_type: "condo", lat: 30.2900, lng: -97.7441, aliases: ["Orange Tree"] },
    { canonical_name: "Park Place Condominiums", area: "north_campus", property_type: "condo", lat: 30.2870, lng: -97.7720, aliases: ["Park Place"] },
    { canonical_name: "Centennial Condos", area: "north_campus", property_type: "condo", lat: 30.2900, lng: -97.7423, aliases: ["Centennial"] },
    // NORTH CAMPUS - Fringe / Small Condo Clusters
    { canonical_name: "Waterford Condominiums", area: "north_campus", property_type: "condo", lat: 30.2884, lng: -97.7492, aliases: ["Waterford"] },
    // RIVERSIDE
    { canonical_name: "Estates at East Riverside", area: "riverside", property_type: "apartment", lat: 30.2383, lng: -97.7135, aliases: ["Estates Riverside"] },
    { canonical_name: "Ballpark East", area: "riverside", property_type: "apartment", lat: 30.2350, lng: -97.7183, aliases: [] },
    { canonical_name: "Town Lake Condos", area: "riverside", property_type: "condo", lat: 30.2404, lng: -97.7181, aliases: ["Town Lake"] },
    // =========================
    // WEST CAMPUS - Apartments (Additional)
    // =========================
    { canonical_name: "24 Longview", area: "west_campus", property_type: "apartment", lat: 30.2887, lng: -97.7505, aliases: ["Twenty Four Longview"] },
    { canonical_name: "21 Pearl", area: "west_campus", property_type: "condo", lat: 30.2845, lng: -97.7468, aliases: ["21Pearl", "Twenty One Pearl", "21 Pearl Condos"] },
    { canonical_name: "2819 Rio", area: "west_campus", property_type: "apartment", lat: 30.2951, lng: -97.7438, aliases: ["2819 Rio Grande"] },
    { canonical_name: "Axis West Campus", area: "west_campus", property_type: "apartment", lat: 30.2902, lng: -97.7501, aliases: ["Axis"] },
    { canonical_name: "Elan 24", area: "west_campus", property_type: "apartment", aliases: ["Elan"] },
    { canonical_name: "GrandMarc Austin", area: "west_campus", property_type: "apartment", lat: 30.2909, lng: -97.7422, aliases: ["GrandMarc"] },
    { canonical_name: "Haus 535", area: "west_campus", property_type: "apartment", lat: 30.3276, lng: -97.7404, aliases: ["Haus535"] },
    { canonical_name: "Ion Austin", area: "west_campus", property_type: "apartment", lat: 30.2842, lng: -97.7433, aliases: ["Ion"] },
    { canonical_name: "The Mark Austin", area: "west_campus", property_type: "apartment", lat: 30.2874, lng: -97.7465, aliases: ["The Mark", "Mark on 23rd", "Mark Austin"] },
    { canonical_name: "Moontower", area: "west_campus", property_type: "apartment", lat: 30.2857, lng: -97.7431, aliases: ["Moontower Austin"] },
    { canonical_name: "Regents West at 24th", area: "west_campus", property_type: "apartment", lat: 30.2884, lng: -97.74769, aliases: ["Regents West 24th"] },
    { canonical_name: "Regents West at 26th", area: "west_campus", property_type: "apartment", lat: 30.2910, lng: -97.7465, aliases: ["Regents West 26th"] },
    { canonical_name: "The Nine at Rio", area: "west_campus", property_type: "apartment", lat: 30.2844, lng: -97.7452, aliases: ["Nine at Rio", "The Nine Rio"] },
    { canonical_name: "Signature 1909", area: "west_campus", property_type: "apartment", lat: 30.2837, lng: -97.7448, aliases: ["Signature", "1909 Rio"] },
    { canonical_name: "Rise at West Campus", area: "west_campus", property_type: "apartment", lat: 30.2859, lng: -97.7441, aliases: ["Rise West Campus", "RISE"] },
    { canonical_name: "Torre", area: "west_campus", property_type: "apartment", lat: 30.2836, lng: -97.7444, aliases: ["Torre Austin"] },
    { canonical_name: "Twenty Two15", area: "west_campus", property_type: "apartment", lat: 30.2863, lng: -97.7444, aliases: ["2215 Rio", "TwentyTwo15", "Twenty Two 15"] },
    { canonical_name: "Union on 24th", area: "west_campus", property_type: "apartment", lat: 30.2876, lng: -97.7453, aliases: ["Union 24th"] },
    { canonical_name: "Union on San Antonio", area: "west_campus", property_type: "apartment", lat: 30.2833, lng: -97.7428, aliases: ["Union San Antonio"] },
    { canonical_name: "Venue on Guadalupe", area: "west_campus", property_type: "apartment", lat: 30.2942, lng: -97.7420, aliases: ["Venue Guadalupe"] },
    { canonical_name: "Vintage West Campus", area: "west_campus", property_type: "apartment", lat: 30.2879, lng: -97.7474, aliases: ["Vintage"] },
    { canonical_name: "Villas on 24th", area: "west_campus", property_type: "apartment", lat: 30.2877, lng: -97.7444, aliases: ["Villas 24th"] },
    { canonical_name: "Villas on 26th", area: "west_campus", property_type: "apartment", lat: 30.2910, lng: -97.7456, aliases: ["Villas 26th"] },
    { canonical_name: "Villas on Nueces", area: "west_campus", property_type: "apartment", lat: 30.2855, lng: -97.7436, aliases: ["Villas Nueces"] },
    { canonical_name: "Villas on Rio", area: "west_campus", property_type: "apartment", lat: 30.2848, lng: -97.7447, aliases: ["Villas Rio"] },
    { canonical_name: "Villas at San Gabriel", area: "west_campus", property_type: "condominium", lat: 30.28906, lng: -97.74793, aliases: ["Villas on San Gabriel", "2501 San Gabriel St", "San Gabriel Villas"] },
    { canonical_name: "Yugo Austin Corner", area: "west_campus", property_type: "apartment", lat: 30.2901, lng: -97.7477, aliases: ["The Corner", "Yugo Corner"] },
    { canonical_name: "Yugo Austin Nueces", area: "west_campus", property_type: "apartment", lat: 30.2896, lng: -97.7432, aliases: ["Yugo Nueces"] },
    { canonical_name: "Yugo Austin Rio", area: "west_campus", property_type: "apartment", lat: 30.2883, lng: -97.7444, aliases: ["Yugo Rio", "Ruckus on Rio", "The Ruckus"] },
    { canonical_name: "Yugo Austin Waterloo", area: "west_campus", property_type: "apartment", lat: 30.2882, lng: -97.7441, aliases: ["Yugo Waterloo", "Waterloo", "waterloo Place", "2400 Nueces St", "Waterloo at 24th"] },
    { canonical_name: "Inspire on 22nd", area: "west_campus", property_type: "apartment", lat: 30.2854, lng: -97.7442, aliases: ["Inspire 22nd"] },
    { canonical_name: "Lark Austin", area: "west_campus", property_type: "apartment", lat: 30.2841, lng: -97.7443, aliases: ["Lark"] },
    // =========================
    // WEST CAMPUS - Condos / Lofts / Clusters (Additional)
    // =========================
    { canonical_name: "Croix Condominiums", area: "west_campus", property_type: "condo", lat: 30.2887, lng: -97.7460, aliases: ["Croix", "The Croix"] },
    { canonical_name: "Lone Star Lofts", area: "west_campus", property_type: "condo", lat: 30.2891, lng: -97.7496, aliases: ["Lone Star Loft"] },
    { canonical_name: "Palmetto Condominiums", area: "west_campus", property_type: "condo", lat: 30.2848, lng: -97.7453, aliases: ["Palmetto", "Palmetto Condos"] },
    { canonical_name: "Parapet Condominiums", area: "west_campus", property_type: "condo", lat: 30.2937, lng: -97.7437, aliases: ["Parapet", "Parapet Condos"] },
    { canonical_name: "Pointe on Rio", area: "west_campus", property_type: "apartment", lat: 30.2830, lng: -97.7450, aliases: ["The Pointe on Rio", "Pointe Rio"] },
    { canonical_name: "Texan Tower", area: "west_campus", property_type: "condo", lat: 30.2901, lng: -97.7474, aliases: ["Texan Tower Condos"] },
    { canonical_name: "Texan Pearl", area: "west_campus", property_type: "condo", lat: 30.2906, lng: -97.7463, aliases: ["Texan Pearl Condos"] },
    { canonical_name: "Noble 2500", area: "west_campus", property_type: "apartment", lat: 30.2897, lng: -97.7478, aliases: ["Noble", "Noble Apartments", "Noble 2500 Austin"] },
    { canonical_name: "Sparq on Rio", area: "west_campus", property_type: "apartment", lat: 30.2927, lng: -97.7443, aliases: ["Sparq", "Rio West", "Sparq on Rio Apartments"] },
    { canonical_name: "Texan West Campus", area: "west_campus", property_type: "apartment", lat: 30.2924, lng: -97.7452, aliases: ["The Texan", "Texan Apartments", "Texan & Vintage", "Texan West Campus Apartments"] },
    { canonical_name: "Delphi Condominiums", area: "west_campus", property_type: "condominium", lat: 30.2883, lng: -97.7455, aliases: ["Delphi", "Delphi Condos", "Delphi Apartments", "Delphi Austin"] },
    { canonical_name: "Nueces Corner Condos", area: "west_campus", property_type: "condominium", lat: 30.2932, lng: -97.7431, aliases: ["Nueces Corner", "Nueces Corner Condominiums", "Nueces Corner Austin"] },
    { canonical_name: "Buena Vista Condominiums", area: "west_campus", property_type: "condominium", lat: 30.2830, lng: -97.7434, aliases: ["Buena Vista", "Buena Vista Condos", "Buena Vista Austin"] },
    { canonical_name: "Texan 26", area: "west_campus", property_type: "apartment", lat: 30.2908, lng: -97.7481, aliases: ["Texan26", "Texan 26 Apartments", "Texan 26 Austin", "Student | Texan26"] },
    { canonical_name: "Tradition on Rio", area: "west_campus", property_type: "apartment", lat: 30.2832, lng: -97.7449, aliases: ["The Tradition", "Tradition", "Tradition Apartments", "Tradition on Rio Austin"] },
    { canonical_name: "Gamma Phi Beta House", area: "west_campus", property_type: "greek_housing", lat: 30.2872, lng: -97.7507, aliases: ["Gamma Phi", "GPhi", "Gamma Phi Beta Austin", "Alpha Zeta Chapter"] },
    { canonical_name: "Envoy Apartments", area: "west_campus", property_type: "apartment", lat: 30.2853, lng: -97.7483, aliases: ["The Envoy", "Envoy West Campus", "Envoy Austin"] },
    { canonical_name: "Camino Flats", area: "west_campus", property_type: "apartment", lat: 30.2945, lng: -97.7454, aliases: ["Camino", "Camino Flats Austin", "Camino West Campus"] },
    { canonical_name: "East Campus Graduate Apartments", area: "east_campus", property_type: "apartment", lat: 30.2825, lng: -97.7225, aliases: ["East Graduate Apartments", "ECGA", "UT Graduate Housing"] },
    { canonical_name: "Leon Place Condominiums", area: "west_campus", property_type: "condominium", lat: 30.2858, lng: -97.7490, aliases: ["Leon St Condominiums", "Leon Place", "2207 Leon"] },
    { canonical_name: "Legacy on Rio", area: "west_campus", property_type: "apartment", lat: 30.2917, lng: -97.7443, aliases: ["Legacy", "Legacy on Rio Austin"] },
    { canonical_name: "Hilltop", area: "west_campus", property_type: "apartment", lat: 30.288425468929795, lng: -97.74799044670915, aliases: ["Hilltop Austin", "Hilltop Apartments", "2400 San Gabriel"] },
    { canonical_name: "The Block on Rio", area: "west_campus", property_type: "apartment", lat: 30.2946, lng: -97.7441, aliases: ["Block on Rio", "The Block at 28th"] },
    { canonical_name: "The Block on Leon", area: "west_campus", property_type: "apartment", lat: 30.2902, lng: -97.7490, aliases: ["Block on Leon", "2510 Leon"] },
    { canonical_name: "Icon at Austin", area: "west_campus", property_type: "apartment", lat: 30.2853, lng: -97.7431, aliases: ["Icon", "Icon Apartments"] },
    { canonical_name: "Town Lake Apartments", area: "riverside", property_type: "apartment", lat: 30.2443, lng: -97.7161, aliases: ["Town Lake", "Town Lake at Austin", "Town Lake Student Housing"] },
    { canonical_name: "Kappa Kappa Gamma House", area: "west_campus", property_type: "greek_housing", lat: 30.2826, lng: -97.7395, aliases: ["Texas Kappa", "Kappa House", "KKG", "Beta Xi Chapter"] },
    { canonical_name: "1883 at Montgomery House", area: "west_campus", property_type: "apartment", lat: 30.2925, lng: -97.7441, aliases: ["Montgomery House", "The Quarters - Montgomery House", "1883 Montgomery"] },
    { canonical_name: "Marq Uptown", area: "hancock", property_type: "apartment", lat: 30.2974, lng: -97.7228, aliases: ["The Marq Uptown", "Marq Uptown Austin", "Uptown at University Park", "3320 Harmon"] },
    // =========================
    // NORTH CAMPUS - Apartments (Additional)
    // =========================
    { canonical_name: "Aster House", area: "north_campus", property_type: "apartment", lat: 30.3059, lng: -97.7430, aliases: ["Aster"] },
    { canonical_name: "Hyde Park Court", area: "north_campus", property_type: "apartment", lat: 30.3019, lng: -97.7354, aliases: ["Hyde Park Ct"] },
    // =========================
    // NORTH CAMPUS - Condos (Additional)
    // =========================
    { canonical_name: "Juliet Condominiums", area: "north_campus", property_type: "condo", lat: 30.2873, lng: -97.7482, aliases: ["Juliet Condos"] },
    { canonical_name: "Windtree Condominiums", area: "north_campus", property_type: "condo", lat: 30.2943, lng: -97.7370, aliases: ["Windtree Condos", "Wind Tree", "Windtree"] },
    // =========================
    // RIVERSIDE - Apartments (Additional)
    // =========================
    { canonical_name: "Ballpark North", area: "riverside", property_type: "apartment", lat: 30.2385, lng: -97.7169, aliases: ["Ballpark Apts North"] },
    { canonical_name: "Village at East Riverside", area: "riverside", property_type: "apartment", lat: 30.2359, lng: -97.7115, aliases: ["University Village", "Village East Riverside"] },
    { canonical_name: "Town Lake at Austin", area: "riverside", property_type: "apartment", lat: 30.2404, lng: -97.7181, aliases: ["Town Lake Apartments"] },
    { canonical_name: "Gateway Apartments", area: "clarksville", property_type: "apartment", lat: 30.2778, lng: -97.7637, aliases: ["UT Apartments", "UT Graduate Apartments", "University Apartments", "Gateway"] },
    { canonical_name: "Laurel House Co-op", area: "west_campus", property_type: "co_op", lat: 30.28285, lng: -97.74325, aliases: ["Laurel House", "Laurel Co-op", "Super Co-op Floors 1-2"] },
    { canonical_name: "Nueces Co-op", area: "west_campus", property_type: "co_op", lat: 30.28275, lng: -97.74325, aliases: ["Nueces House", "Super Co-op Floor 3"] },
    { canonical_name: "Halstead Co-op", area: "west_campus", property_type: "co_op", lat: 30.28280, lng: -97.74315, aliases: ["Halstead House", "Super Co-op Floors 4-5"] },
    { canonical_name: "North Loop House", area: "north_loop", property_type: "apartment", lat: 30.3148, lng: -97.7148, aliases: ["North Loop", "North Loop Apartments", "North Loop Austin"] },
];

module.exports = APARTMENT_DATA;
