import {isOptionValueInEncoding} from '@shopify/hydrogen-react';

const encodedOptionValues = '0:0-2,1:3';

// Returns true since there are entries for first option (value 0, 1, 2)
isOptionValueInEncoding([0], encodedOptionValues); // Return true

isOptionValueInEncoding([0, 0], encodedOptionValues); // Return true
isOptionValueInEncoding([0, 1], encodedOptionValues); // Return true
isOptionValueInEncoding([0, 2], encodedOptionValues); // Return true
isOptionValueInEncoding([0, 3], encodedOptionValues); // Return false

// Returns true since there is an entry for second option (value 3)
isOptionValueInEncoding([1], encodedOptionValues); // Return true

isOptionValueInEncoding([1, 0], encodedOptionValues); // Return false
isOptionValueInEncoding([1, 1], encodedOptionValues); // Return false
isOptionValueInEncoding([1, 2], encodedOptionValues); // Return false
isOptionValueInEncoding([1, 3], encodedOptionValues); // Return true

// Returns false since there is no entry for the third option
isOptionValueInEncoding([2], encodedOptionValues); // Return false
