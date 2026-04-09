import { redirect } from "next/navigation";

const Page = () => {
  redirect("/medusa/admin-api/meilisearch/search");
};

export default Page;
