// tsconfig.app.json pins `types` to ["vite/client"], so @types/mdx is not picked
// up automatically. This reference pulls it in, giving .mdx imports a component
// type instead of an implicit any.
/// <reference types="mdx" />
