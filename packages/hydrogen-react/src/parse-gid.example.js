import {parseGid} from '@shopify/hydrogen-react';

const {id, resource} = parseGid('gid://shopify/Order/123');

console.log(id); // 123
console.log(resource); // Order
