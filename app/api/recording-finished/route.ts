import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {

    // get the file; if no file is received, return an error
    const file = await getFile(request);
    if (!file) {
      return Response.json({ error: "No files received." }, { status: 400 });
    }

    // use openai to get the transcript
    const transcript = await getTranscript(file);
    
    return Response.json({success: true});
    
	} catch (error) {
		console.error(error);
		return Response.json({ success: false });
	}
}

const getFile = async (request: NextRequest) => { 
  const formData = await request.formData();
  const file = formData.get("file") as File;
  return file;
}

const getTranscript = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  form.append('model', 'whisper-1');
  form.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form
  });
  const transcript = await response.text();
  return transcript;
}
