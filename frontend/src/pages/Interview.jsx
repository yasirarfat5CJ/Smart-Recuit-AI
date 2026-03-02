import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../services/socket";

export default function Interview() {

  const { candidateId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  // START INTERVIEW
  const startInterview = () => {
    setError("");
    setConnectionState("connecting");
    setProcessing(true);
    socket.connect();
    socket.emit("startInterview", { candidateId });

    setStarted(true);
  };

  // SOCKET EVENTS
  useEffect(() => {
    const onConnect = () => {
      setConnectionState("connected");
    };

    const onDisconnect = () => {
      setConnectionState("disconnected");
    };

    const onConnectError = () => {
      setConnectionState("disconnected");
      setStarted(false);
      setProcessing(false);
      setError("Connection failed. Please login again and retry.");
    };

    socket.on("aiQuestion", (question) => {
      setProcessing(false);
      setMessages(prev => [
        ...prev,
        { sender: "ai", text: question }
      ]);

    });

    socket.on("aiEvaluation", (data) => {
      setProcessing(false);
      setMessages(prev => [
        ...prev,
        { sender: "ai", text: `Feedback: ${data.feedback}` },
        { sender: "ai", text: data.nextQuestion }
      ]);

    });

    socket.on("finalSummary", (summary) => {
      setProcessing(false);

      navigate("/summary", { state: { summary, candidateId } });

    });

    socket.on("error", (msg) => {
      setProcessing(false);
      setError(typeof msg === "string" ? msg : "Something went wrong.");
    });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {

      socket.off("aiQuestion");
      socket.off("aiEvaluation");
      socket.off("finalSummary");
      socket.off("error");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);

      socket.disconnect();

    };

  }, [candidateId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

  // SEND MESSAGE
  const sendMessage = () => {

    if (!input.trim() || processing) return;

    setMessages(prev => [
      ...prev,
      { sender: "user", text: input.trim() }
    ]);

    setProcessing(true);
    socket.emit("candidateAnswer", { answer: input.trim() });

    setInput("");
  };

  return (

    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-6 transition-colors duration-300">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl md:text-3xl font-bold">
          AI Technical Interview
        </h1>

        <div className={`text-xs px-3 py-1 rounded-full ${
          connectionState === "connected"
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            : connectionState === "connecting"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        }`}>
          {connectionState}
        </div>

      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid md:grid-cols-4 gap-6">

        {/* LEFT SIDEBAR */}
        <div className="md:col-span-1 p-4 rounded shadow bg-white dark:bg-gray-800">

          <h2 className="font-bold mb-4">Interview Info</h2>

          <p>Candidate ID:</p>
          <p className="text-sm break-all">{candidateId}</p>

          {!started && (

            <button
              onClick={startInterview}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700 transition disabled:opacity-70"
              disabled={connectionState === "connecting"}
            >
              {connectionState === "connecting" ? "Starting..." : "Start Interview"}
            </button>

          )}

        </div>

        {/* CHAT SECTION */}
        <div className="md:col-span-3 p-4 rounded shadow flex flex-col bg-white dark:bg-gray-800">

          <div className="flex-1 overflow-y-auto h-[450px]">

            {messages.map((msg, index) => (

              <div
                key={index}
                className={`mb-3 ${msg.sender === "user" ? "text-right" : ""}`}
              >

                <span
                  className={`inline-block px-4 py-2 rounded-lg
                    ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-purple-100 dark:bg-purple-700 text-gray-900 dark:text-white"
                    }`}
                >
                  {msg.text}
                </span>

              </div>

            ))}

            {processing ? (
              <div className="mb-3">
                <span className="inline-block px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm">
                  AI is thinking...
                </span>
              </div>
            ) : null}

            <div ref={messagesEndRef} />

          </div>

          {started && (

            <div className="flex gap-2 mt-4">

              <input
                value={input}
                onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                className="flex-1 border dark:border-gray-600 p-2 rounded
                           bg-white dark:bg-gray-700
                           text-gray-900 dark:text-white"
                placeholder="Type your answer..."
              />

              <button
                onClick={sendMessage}
                disabled={processing || !input.trim()}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Send
              </button>

              <button
                onClick={() => {
                  setProcessing(true);
                  socket.emit("endInterview");
                }}
                disabled={processing || messages.length === 0}
                className="bg-red-500 text-white px-4 rounded hover:bg-red-600 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                End
              </button>

            </div>

          )}

        </div>

      </div>

    </div>

  );
}
