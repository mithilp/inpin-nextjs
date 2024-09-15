import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    // get the file; if no file is received, return an error
    const file = await getFile(request);
    if (!file) {
      return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    console.log("file name", file.name);
    
    // use openai to get the transcript
    const transcript = await getTranscript(file);

    console.log("transcript", transcript);
    
    const [query, message] = await getQuery(transcript);

    console.log("query", query);
    console.log("message", message);

    // send linkedin request
    const linkedinResponse = await sendLinkedinRequest(query, message.trim());
    console.log("linkedinResponse", linkedinResponse);

    // save to db
    await saveToDb(transcript, query, message);

    return NextResponse.json({ success: true, transcript: transcript, query: query,message: message, linkedinResponse: linkedinResponse });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false });
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

const getQuery = async (transcript: string) => {
  const response = await fetch('https://api.cohere.com/v1/chat', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `bearer ${process.env.COHERE_API_KEY}`
    },
    body: JSON.stringify({
      'message': transcript,
      'chat_history': [
        {
          'message': 'Hi there, whats your name? Hello, my name is Atharv. Oh, where do you work, Atharv? I actually work at Cohere. Cohere, thats pretty interesting. Yeah, Im based in the San Francisco Bay Area. Im from there too. Oh, thats pretty cool. Im actually a high schooler right now. Oh shit, we actually have a lot of high school opportunities, you know. Really? Yeah, we like to start them young, you know. Interesting. Yeah. So whats your role at Cohere, what do you do? I am a software engineer. Hmm. And I focus on LLMs and shit. You feel me? LLMs? Yeah. Got you. Yeah, yeah. Well, nice meeting you. Yeah, yeah. Lets keep in touch. Yeah, for sure. Theres some dusty ass motherfuckers working on this LinkedIn project. Uh-huh. And I hear theyre using our APIs. Yeah. All right. Looking forward to seeing you later. Yeah, for sure.',
          'role': 'USER'
        },
        {
          'message': 'Atharv Cohere engineer; Hey Atharv, loved talking earlier about your role at Cohere in the Bay Area, looking forward to connecting!',
          'role': 'CHATBOT'
        },
        {
          'message': 'Hi there, whats your name? My name is Mithil. What do you do? Im actually an engineer at Google. Im based out of New York. Oh, thats pretty cool. What school did you go to? I went to school in Waterloo, in Canada. Interesting...',
          'role': 'USER'
        },
        {
          'message': 'Mithil, Google engineer, Waterloo; Hey Mithil, loved earned about your experience at Google in New York and your experiences at Waterloo in Canada.',
          'role': 'CHATBOT'
        },

        {
          'message': 'Hi there, whats your name? My name is Anav. What do you do? Im actually one of the co-founders of Code for Cause. Im based out of Los Altos. Oh, thats pretty cool. What school do you go to? I go to BASIS Independent Silicon Valley. Interesting...',
          'role': 'USER'
        },
        {
          'message': 'Anav, Code for Cause, BASIS; Hey Anav, loved talking earlier about your role at Code for Cause in Los Altos, looking forward to connecting!',
          'role': 'CHATBOT'
        },
      ],
      'model': 'command-r-plus',
      'preamble': 'You will receive a transcript of a conversation. You will take insights from those conversations, and use them to create a query that can be used to find the person from the conversation on LinkedIn. For example, try to create a prompt that is short with 4-6 words, includes the person\'s name and if possible includes their location, company, and title. Then, also write a short message to be attached to that connection request. For example, you might say "Hey, Person Name, had a great time talking about ____ and ____ with you earlier. Looking forward to connecting!" Separate the two sections with a semicolon (;).',
    })
  });

  const json = await response.json();

  return json.text.split(';');
}


const sendLinkedinRequest = async (query: string, message: string) => {
  const headersList = {
  "Accept": "*/*",
  }

  const response = await fetch(`https://2efd-2620-101-f000-7c2-00-630d.ngrok-free.app/api/send-linkedin-connection?query=${query}&message=${message}`, { 
    method: "POST",
    headers: headersList
  });

  const data = await response.json();
  
  return data;

}

const saveToDb = async (transcript: string, query: string, message: string) => {

  await fetchMutation(api.myFunctions.addConversation, {
    transcript: transcript,
    query: query,
    message: message,
  });
}