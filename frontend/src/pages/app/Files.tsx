import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type FileRow = { name: string; signedUrl?: string };

export function Files() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data, error } = await supabase.storage.from("client_uploads").list(user.id, {
        limit: 50,
        sortBy: { column: "name", order: "desc" }
      });

      if (error) return setStatus("Failed to list files.");
      const rows = (data ?? []).map((x) => ({ name: x.name }));
      setFiles(rows);
    })();
  }, [user]);

  async function openSigned(name: string) {
    if (!user) return;
    const path = `${user.id}/${name}`;
    const { data, error } = await supabase.storage.from("client_uploads").createSignedUrl(path, 60 * 10);
    if (error) return setStatus("Failed to create signed URL.");

    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="card">
      <h3>My Files</h3>
      {status && <p>{status}</p>}

      {files.length === 0 ? (
        <p><small>No files yet.</small></p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.name}>
              {f.name}{" "}
              <button onClick={() => openSigned(f.name)} style={{ marginLeft: 8 }}>
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
