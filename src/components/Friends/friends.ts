import _raphdf201 from "@/assets/friends/raphdf201.png";
import _samyth from "@/assets/friends/samyth.svg";

// The people credited on projects, listed in About, and mentioned in the footer. One entry each, so a new domain or
// icon is one edit. Icons are copies, not hotlinks: assets.raphdf201.net/favicon.ico went 404 once already.
export type Friend = {
    name: string;
    site: string; // the domain as it reads, no scheme
    url: string;
    icon: string;
    blurb: string; // one line for the friends block in About
};

export const FRIENDS = {
    raphael: {
        name: "Raphaël",
        site: "raphdf201.net",
        url: "https://www.raphdf201.net/",
        icon: _raphdf201,
        blurb: "Team 3990, and one third of TechNexus.",
    },
    samy: {
        name: "Samy",
        site: "samyth.dev",
        url: "https://samyth.dev/",
        icon: _samyth,
        blurb: "Team 3990, one third of TechNexus, and the coziest website I know.",
    },
} satisfies Record<string, Friend>;

export const friendList: Friend[] = Object.values(FRIENDS);
