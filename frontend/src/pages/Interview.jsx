import { ArrowLeft, CircleStop, Mic, Send, Square, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import socket from "../services/socket";

const modeNames = { project: "Project", technical: "Technical", hr: "HR" };

export default function Interview() {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const interviewType = ["project", "technical", "hr"].includes(searchParams.get("type")) ? searchParams.get("type") : "technical";
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [inputMode, setInputMode] = useState("text");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Use Chrome or Edge, or type your answer.");
      return;
    }

    setError("");
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalTranscript = input ? `${input.trim()} ` : "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscript += `${transcript} `;
        else interim += transcript;
      }
      setInput(`${finalTranscript}${interim}`.trimStart());
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted") setError(`Microphone error: ${event.error}.`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const startInterview = () => {
    setError("");
    setProcessing(true);
    socket.connect();
    socket.emit("startInterview", { candidateId, interviewType });
    setStarted(true);
  };

  const sendAnswer = () => {
    const answer = input.trim();
    if (!answer || processing) return;
    stopListening();
    setMessages((current) => [...current, { sender: "user", text: answer }]);
    setInput("");
    setProcessing(true);
    socket.emit("candidateAnswer", { answer });
  };

  const endInterview = () => {
    stopListening();
    setProcessing(true);
    socket.emit("endInterview");
  };

  useEffect(() => {
    const onQuestion = (question) => {
      setProcessing(false);
      setMessages((current) => [...current, { sender: "ai", text: question }]);
    };
    const onEvaluation = (data) => {
      setProcessing(false);
      setMessages((current) => [
        ...current,
        ...(data?.feedback ? [{ sender: "feedback", text: data.feedback }] : []),
        { sender: "ai", text: data.nextQuestion }
      ]);
    };
    const onSummary = (summary) => {
      setProcessing(false);
      navigate("/summary", { state: { summary, candidateId, interviewType } });
    };
    const onError = (message) => {
      setProcessing(false);
      setError(typeof message === "string" ? message : "Something went wrong.");
    };

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => onError("Could not connect to the interview server."));
    socket.on("aiQuestion", onQuestion);
    socket.on("aiEvaluation", onEvaluation);
    socket.on("finalSummary", onSummary);
    socket.on("error", onError);

    return () => {
      stopListening();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [candidateId, interviewType, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

  return (
    <main className="min-h-screen bg-slate-100 pt-16 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="icon-button" title="Back to dashboard"><ArrowLeft size={19} /></button>
            <div><h1 className="font-semibold">{modeNames[interviewType]} interview</h1><p className="text-xs text-slate-500">Questions use only your resume</p></div>
          </div>
          <span className={`flex items-center gap-2 text-xs ${connected ? "text-emerald-600" : "text-slate-500"}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} /> {connected ? "Connected" : "Offline"}
          </span>
        </header>

        {error && <div className="error-banner m-4 sm:mx-6">{error}</div>}

        <section className="flex flex-1 flex-col bg-white dark:bg-slate-900">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            {!started && (
              <div className="mx-auto max-w-lg py-20 text-center">
                <h2 className="text-2xl font-bold">Ready for your {modeNames[interviewType].toLowerCase()} practice?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">The AI will ask one question at a time and adapt to each answer. You can type or dictate your response.</p>
                <button onClick={startInterview} disabled={processing} className="primary-button mt-7">{processing ? "Preparing questions..." : "Begin interview"}</button>
              </div>
            )}

            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((message, index) => (
                <div key={`${message.sender}-${index}`} className={message.sender === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[85%]"}>
                  <p className="mb-1 text-xs font-medium text-slate-500">{message.sender === "user" ? "You" : message.sender === "feedback" ? "Coach note" : "Interviewer"}</p>
                  <div className={`px-4 py-3 text-sm leading-6 ${message.sender === "user" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : message.sender === "feedback" ? "border-l-2 border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {message.text}
                  </div>
                </div>
              ))}
              {processing && started && <div className="text-sm text-slate-500">Interviewer is thinking...</div>}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {started && (
            <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 inline-flex border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                  <button onClick={() => { stopListening(); setInputMode("text"); }} className={`mode-button ${inputMode === "text" ? "mode-button-active" : ""}`}><Type size={16} /> Type</button>
                  <button onClick={() => setInputMode("voice")} className={`mode-button ${inputMode === "voice" ? "mode-button-active" : ""}`}><Mic size={16} /> Voice</button>
                </div>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendAnswer();
                    }
                  }}
                  rows={3}
                  placeholder={inputMode === "voice" ? "Start the microphone. Your speech will appear here for review." : "Type your answer..."}
                  className="w-full resize-none border border-slate-300 bg-white p-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {inputMode === "voice" && (
                      <button onClick={listening ? stopListening : startListening} className={listening ? "danger-button" : "secondary-button"}>
                        {listening ? <><Square size={16} /> Stop listening</> : <><Mic size={16} /> Start microphone</>}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={endInterview} disabled={processing || messages.length < 2} className="secondary-button"><CircleStop size={17} /> Finish</button>
                    <button onClick={sendAnswer} disabled={processing || !input.trim()} className="primary-button"><Send size={17} /> Send answer</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
