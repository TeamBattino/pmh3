export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type FooterDoc = {
  columns: FooterColumn[];
  legalLinks: FooterLink[];
};

export const defaultFooterDoc: FooterDoc = {
  columns: [],
  legalLinks: [],
};
