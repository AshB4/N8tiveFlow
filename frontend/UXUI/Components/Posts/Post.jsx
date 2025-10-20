import { Helmet } from "react-helmet-async";
import { runSeoCheck } from "@/lib/seoCheckRunner";

const Post = ({ post }) => {
	const seo = runSeoCheck(post.id); // or title/slug

	if (!seo.ok) return null;

	return (
		<>
			<Helmet>
				<title>{seo.meta.title}</title>
				<meta name="description" content={seo.meta.description} />
				<link rel="canonical" href={seo.meta.url} />
				<script type="application/ld+json">
					{JSON.stringify(seo.schema)}
				</script>
			</Helmet>
			{/* Actual Post UI here */}
		</>
	);
};
export default Post;