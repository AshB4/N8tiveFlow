import { useEffect, useState } from "react";

export default function PostSelector({ selectedPost, onSelect }) {
  const [posts, setPosts] = useState([]);
  const [newText, setNewText] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    fetch('/posts/posts.json')
      .then(res => res.json())
      .then(setPosts)
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    if (id === "__new__") {
      setCreatingNew(true);
      onSelect({ id: null, body: newText });
    } else {
      setCreatingNew(false);
      const post = posts.find(p => p.id === id);
      onSelect(post || null);
    }
  };

  const handleNewText = (e) => {
    setNewText(e.target.value);
    onSelect({ id: null, body: e.target.value });
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 font-semibold">Select Post</label>
      <select
        className="border p-2 mb-2 w-full"
        value={selectedPost?.id || (creatingNew ? "__new__" : "")}
        onChange={handleChange}
      >
        <option value="">-- Choose a post --</option>
        {posts.map(p => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
        <option value="__new__">New Post...</option>
      </select>
      {creatingNew && (
        <textarea
          className="border p-2 w-full"
          placeholder="Write new post..."
          value={newText}
          onChange={handleNewText}
        />
      )}
    </div>
  );
}
