// Everything in the $lang folder is a re-export of the route folder
// Wondering if we can just have it as a build process (dynamically creates these
// files based on the files in the routes folder) during build/hot reload process
export {default, loader} from '~/routes/index';
