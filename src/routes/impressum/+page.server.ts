import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {
    companyName: process.env.IMPRESSUM_COMPANY_NAME || null,
    street: process.env.IMPRESSUM_STREET || null,
    city: process.env.IMPRESSUM_CITY || null,
    contactEmail: process.env.IMPRESSUM_CONTACT_EMAIL || null,
    phone: process.env.IMPRESSUM_PHONE || null,
    vatId: process.env.IMPRESSUM_VAT_ID || null,
  };
};
