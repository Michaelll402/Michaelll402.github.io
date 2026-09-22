// The skill words are locked Phase-0 content and are not rewritten here.
// v4 drops the logo wall (its brief bans one) and keeps the marks as small
// monochrome glyphs set inline with the words, the way a typographic index
// would set them. Build-time only: no runtime JavaScript, no icon package
// shipped to the browser.
import * as si from "simple-icons";

export type Icon = { path: string; hex: string } | null;
const I = (icon: { path: string; hex: string } | undefined): Icon =>
  icon ? { path: icon.path, hex: `#${icon.hex}` } : null;



export const GLYPHS: Record<string, string> = {
  // database cylinder
  SQL: "M12 2C7.6 2 4 3.3 4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5c0-1.7-3.6-3-8-3Zm0 2c3.9 0 6 1 6 1s-2.1 1-6 1-6-1-6-1 2.1-1 6-1Zm6 15c0 .4-2.1 1.4-6 1.4S6 19.4 6 19v-3.2c1.5.8 3.7 1.2 6 1.2s4.5-.4 6-1.2Zm0-6c0 .4-2.1 1.4-6 1.4S6 13.4 6 13V9.8C7.5 10.6 9.7 11 12 11s4.5-.4 6-1.2Z",
  // braces + arrows (API)
  "REST APIs": "M7.2 4C5.4 4 4.6 5 4.6 6.6v2.6c0 1-.4 1.6-1.6 1.8v2c1.2.2 1.6.8 1.6 1.8v2.6C4.6 19 5.4 20 7.2 20h1.4v-2H7.4c-.6 0-.8-.3-.8-1v-2.6c0-1-.5-1.8-1.4-2.4.9-.6 1.4-1.4 1.4-2.4V7c0-.7.2-1 .8-1h1.2V4Zm9.6 0h-1.4v2h1.2c.6 0 .8.3.8 1v2.6c0 1 .5 1.8 1.4 2.4-.9.6-1.4 1.4-1.4 2.4V17c0 .7-.2 1-.8 1h-1.2v2h1.4c1.8 0 2.6-1 2.6-2.6v-2.6c0-1 .4-1.6 1.6-1.8v-2c-1.2-.2-1.6-.8-1.6-1.8V6.6C19.4 5 18.6 4 16.8 4Zm-6.3 4.6L9.1 10l2 2-2 2 1.4 1.4L13.9 12Z",
  // loop arrows (CI/CD)
  "CI/CD": "M12 4a8 8 0 0 0-7.4 5H2.8l3.4 4 3.4-4H7.1A5.9 5.9 0 0 1 12 6.1c1.7 0 3.2.7 4.3 1.8l1.5-1.5A7.9 7.9 0 0 0 12 4Zm8.8 7-3.4-4-3.4 4h2.5a5.9 5.9 0 0 1-9.2 4.1l-1.5 1.5A7.9 7.9 0 0 0 12 20a8 8 0 0 0 7.4-5h1.4Z",
  // cloud
  "AWS basics": "M17.6 10.1a5.6 5.6 0 0 0-11-.8A4.4 4.4 0 0 0 7 18h10.2a4 4 0 0 0 .4-7.9ZM17.2 16H7a2.4 2.4 0 0 1-.3-4.8l1.5-.2.3-1.4a3.6 3.6 0 0 1 7-.2l.3 1.2 1.2.2a2 2 0 0 1-.3 4Z" ,
  /* Azure carries the SAME cloud as AWS, deliberately. Neither is in Simple
     Icons (both marks are trademark-restricted and were removed), so neither
     can have an authentic logo here. They are the same category, so they get
     the same category mark — drawing two different pictures would only be
     inventing a distinction that does not exist. */
  "Azure basics": "M17.6 10.1a5.6 5.6 0 0 0-11-.8A4.4 4.4 0 0 0 7 18h10.2a4 4 0 0 0 .4-7.9ZM17.2 16H7a2.4 2.4 0 0 1-.3-4.8l1.5-.2.3-1.4a3.6 3.6 0 0 1 7-.2l.3 1.2 1.2.2a2 2 0 0 1-.3 4Z",
  // three crates: two down, one composed on top
  "Docker Compose": "M2.6 13.4h6.4v6.4H2.6Zm1.4 1.4v3.6h3.6v-3.6Zm11 -1.4h6.4v6.4H15Zm1.4 1.4v3.6h3.6v-3.6ZM8.8 4.2h6.4v6.4H8.8Zm1.4 1.4v3.6h3.6V5.6Z",
  /* A browser frame being driven. Playwright has no mark in Simple Icons, and
     the theatre-mask pun that was here before collapsed into a blob at 15px.
     This says what the tool does and survives the size. */
  Playwright: "M2.8 4.4h18.4v15.2H2.8Zm1.4 4v9.4h15.6V8.4ZM5.5 5.7h1.3V7H5.5Zm2.4 0h1.3V7H7.9Zm2.4 0h1.3V7h-1.3ZM10.2 10.8l5.2 2.9-5.2 2.9Z",
};

export const groups: { label: string; items: { label: string; icon: Icon }[] }[] = [
  {
    label: "Languages",
    items: [
      { label: "TypeScript", icon: I(si.siTypescript) },
      { label: "JavaScript", icon: I(si.siJavascript) },
      { label: "Python", icon: I(si.siPython) },
      { label: "Java", icon: I(si.siOpenjdk) },
      { label: "C", icon: I(si.siC) },
      { label: "PHP", icon: I(si.siPhp) },
      { label: "SQL", icon: null },
    ],
  },
  {
    label: "Frontend",
    items: [
      { label: "React", icon: I(si.siReact) },
      { label: "Next.js", icon: I(si.siNextdotjs) },
      // NOT siReactquery: that mark is a React atom, and set beside React in
      // the same row the two were indistinguishable. siTanstack is the
      // library's current brand.
      { label: "TanStack Query", icon: I(si.siTanstack) },
      { label: "React Hook Form", icon: I(si.siReacthookform) },
      { label: "Zod", icon: I(si.siZod) },
      { label: "Tailwind CSS", icon: I(si.siTailwindcss) },
      { label: "Vite", icon: I(si.siVite) },
    ],
  },
  {
    label: "Backend",
    items: [
      { label: "Node.js", icon: I(si.siNodedotjs) },
      { label: "Express", icon: I(si.siExpress) },
      { label: "NestJS", icon: I(si.siNestjs) },
      { label: "Laravel", icon: I(si.siLaravel) },
      { label: "REST APIs", icon: null },
      { label: "Prisma", icon: I(si.siPrisma) },
      { label: "JWT and RBAC", icon: I(si.siJsonwebtokens) },
      { label: "Socket.IO", icon: I(si.siSocketdotio) },
    ],
  },
  {
    label: "Databases",
    items: [
      { label: "PostgreSQL", icon: I(si.siPostgresql) },
      { label: "MongoDB", icon: I(si.siMongodb) },
      { label: "MySQL", icon: I(si.siMysql) },
      { label: "SQLite", icon: I(si.siSqlite) },
      { label: "Redis", icon: I(si.siRedis) },
    ],
  },
  {
    label: "Cloud & DevOps",
    items: [
      { label: "Docker", icon: I(si.siDocker) },
      // the whale is Docker's mark; repeating it here read as a duplication
      // bug, so Compose gets the category glyph instead
      { label: "Docker Compose", icon: null },
      { label: "Linux", icon: I(si.siLinux) },
      { label: "GitHub Actions", icon: I(si.siGithubactions) },
      { label: "CI/CD", icon: null },
      { label: "AWS basics", icon: null },
      { label: "Azure basics", icon: null },
      { label: "Bash", icon: I(si.siGnubash) },
    ],
  },
  {
    label: "Testing & Tools",
    items: [
      { label: "Vitest", icon: I(si.siVitest) },
      { label: "Playwright", icon: null },
      { label: "JUnit 5", icon: I(si.siJunit5) },
      { label: "Git", icon: I(si.siGit) },
      { label: "ESLint", icon: I(si.siEslint) },
      { label: "Prettier", icon: I(si.siPrettier) },
    ],
  },
];
