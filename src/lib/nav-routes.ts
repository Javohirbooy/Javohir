import type { AppRole } from "@/lib/permissions";

/** Primary navigation targets scoped by authenticated role (guests use public routes). */
export type RoleScopedNav = {
  home: string;
  subjects: string;
  grades: string;
  tests: string;
  ranking: string;
  about: string;
};

export function getRoleScopedNav(role: AppRole | undefined | null): RoleScopedNav {
  if (!role) {
    return {
      home: "/",
      subjects: "/fanlar",
      grades: "/sinflar",
      tests: "/testlar",
      ranking: "/reyting",
      about: "/biz-haqimizda",
    };
  }

  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return {
      home: role === "SUPER_ADMIN" ? "/super-admin" : "/admin",
      subjects: "/admin/fanlar",
      grades: "/admin/sinflar",
      tests: "/admin/testlar",
      ranking: "/admin/reyting",
      about: "/biz-haqimizda",
    };
  }

  if (role === "TEACHER") {
    return {
      home: "/oqituvchi",
      subjects: "/oqituvchi/fanlar",
      grades: "/oqituvchi/sinflar",
      tests: "/oqituvchi/testlar",
      ranking: "/oqituvchi/reyting",
      about: "/biz-haqimizda",
    };
  }

  return {
    home: "/oquvchi",
    subjects: "/oquvchi/fanlar",
    grades: "/oquvchi/sinflar",
    tests: "/testlar",
    ranking: "/oquvchi/reyting",
    about: "/biz-haqimizda",
  };
}

/** Whether `pathname` should highlight `href` in the navbar (exact home vs prefix for nested routes). */
export function isNavActive(pathname: string, href: string, homeExact: boolean) {
  const p = pathname.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (homeExact) return p === h;
  return p === h || p.startsWith(`${h}/`);
}
