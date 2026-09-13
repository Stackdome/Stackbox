// Central brand-icon registry: slug to themed SVG art. `light` renders in
// light mode, `dark` in dark mode. Most logos are colorful enough to share
// one art; a near-mono one needs a contrasting variant so it stays legible
// on both surfaces.
import dockerUrl from "@/assets/brand/docker.svg";
import dockerLightUrl from "@/assets/brand/docker-light.svg";
import githubUrl from "@/assets/brand/github.svg";
import githubLightUrl from "@/assets/brand/github-light.svg";
import gitlabUrl from "@/assets/brand/gitlab.svg";
import bitbucketUrl from "@/assets/brand/bitbucket.svg";
import giteaUrl from "@/assets/brand/gitea.svg";

export const BRAND_ICONS: Record<string, { light: string; dark: string }> = {
  docker: { light: dockerUrl, dark: dockerLightUrl },
  github: { light: githubUrl, dark: githubLightUrl },
  gitlab: { light: gitlabUrl, dark: gitlabUrl },
  bitbucket: { light: bitbucketUrl, dark: bitbucketUrl },
  gitea: { light: giteaUrl, dark: giteaUrl },
};

export function hasBrandIcon(slug: string | undefined): slug is string {
  return !!slug && slug in BRAND_ICONS;
}
