import type {SyntheticEvent} from "react";

// The people credited on projects, listed in About, and mentioned in the footer. One entry each, so a new domain or
// icon is one edit. Icons are links to pictures they host, not copies: Samy's is his site's own icon, Raphaël's is his
// GitHub avatar (his duck), because raphdf201.net currently serves this site's icons as its favicon.
export type Friend = {
    name: string;
    site: string; // the domain as it reads, no scheme
    url: string;
    icon: string; // a URL on their side
    blurb: string; // one line for the friends block in About
};

export const FRIENDS = {
    raphael: {
        name: "Raphaël",
        site: "raphdf201.net",
        url: "https://www.raphdf201.net/",
        icon: "https://avatars.githubusercontent.com/u/77933281?s=144",
        blurb: "Team 3990, and one third of TechNexus.",
    },
    samy: {
        name: "Samy",
        site: "samyth.dev",
        url: "https://samyth.dev/",
        icon: "https://samyth.dev/favicon.svg",
        blurb: "Team 3990, one third of TechNexus, and the coziest website I know.",
    },
} satisfies Record<string, Friend>;

export const friendList: Friend[] = Object.values(FRIENDS);

// A linked icon can go missing (assets.raphdf201.net/favicon.ico once did): hide it rather than show a broken image.
export function hideBrokenIcon(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = "none";
}
