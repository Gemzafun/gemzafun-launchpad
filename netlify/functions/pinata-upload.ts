
export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    return Response.json(
      { error: "Pinata configuration missing" },
      { status: 500 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Please provide a file" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "Maximum file size is 10 MB" },
        { status: 413 }
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("network", "public");

    const response = await fetch(
      "https://uploads.pinata.cloud/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: uploadForm,
      }
    );

    const responseText = await response.text();

let result: any;

try {
  result = JSON.parse(responseText);
} catch {
  result = {};
}

if (!response.ok) {
  console.error("Pinata error:", response.status, result);

  return Response.json(
    {
      error:
        result.error ||
        result.message ||
        `Pinata upload failed (HTTP ${response.status})`
    },
    { status: response.status }
  );
}

    return Response.json({
      success: true,
      cid: result.data.cid,
      name: result.data.name,
      url: `https://gateway.pinata.cloud/ipfs/${result.data.cid}`,
    });
  } catch {
    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
};
