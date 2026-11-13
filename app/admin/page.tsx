import type { Metadata } from "next";
import { AdminConsole } from "../../components/AdminConsole";
import { getRecentInquiries, getSiteData } from "../../db/site";
import { requireCmsPage } from "../../lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Manager",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const user = await requireCmsPage();
  const [data, inquiries] = await Promise.all([
    getSiteData(),
    getRecentInquiries(),
  ]);
  return (
    <AdminConsole
      initialData={{
        categories: data.categories,
        products: data.products,
        contentBlocks: data.contentBlocks,
        catalogEditorials: data.catalogEditorials,
        settings: data.settings,
        seoEntries: data.seoEntries,
        clientLogos: data.clientLogos,
        blogs: data.blogs,
        inquiries,
      }}
      user={{ displayName: user.displayName, email: user.email }}
    />
  );
}
