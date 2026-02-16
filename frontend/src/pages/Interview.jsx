import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../services/socket";

export default function Interview() {

  const { candidateId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);

  // START INTERVIEW
  const startInterview = () => {

    socket.connect();
    socket.emit("startInterview", { candidateId });

    setStarted(true);
  };

  // SOCKET EVENTS
  useEffect(() => {

    socket.on("aiQuestion", (question) => {

      setMessages(prev => [
        ...prev,
        { sender: "ai", text: question }
      ]);

    });

    socket.on("aiEvaluation", (data) => {

      setMessages(prev => [
        ...prev,
        { sender: "ai", text: `Feedback: ${data.feedback}` },
        { sender: "ai", text: data.nextQuestion }
      ]);

    });

    socket.on("finalSummary", (summary) => {

      navigate("/summary", { state: { summary } });

    });

    return () => {

      socket.off("aiQuestion");
      socket.off("aiEvaluation");
      socket.off("finalSummary");

      socket.disconnect();

    };

  }, [candidateId]);

  // SEND MESSAGE
  const sendMessage = () => {

    if (!input) return;

    setMessages(prev => [
      ...prev,
      { sender: "user", text: input }
    ]);

    socket.emit("candidateAnswer", { answer: input });

    setInput("");
  };

  return (

    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-6 transition-colors duration-300">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          AI Technical Interview
        </h1>

      </div>

      <div className="grid grid-cols-4 gap-6">

        {/* LEFT SIDEBAR */}
        <div className="col-span-1 p-4 rounded shadow bg-white dark:bg-gray-800">

          <h2 className="font-bold mb-4">Interview Info</h2>

          <p>Candidate ID:</p>
          <p className="text-sm break-all">{candidateId}</p>

          {!started && (

            <button
              onClick={startInterview}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700"
            >
              Start Interview
            </button>

          )}

        </div>

        {/* CHAT SECTION */}
        <div className="col-span-3 p-4 rounded shadow flex flex-col bg-white dark:bg-gray-800">

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

          </div>

          {started && (

            <div className="flex gap-2 mt-4">

              <input
                value={input}
                onChange={(e)=>setInput(e.target.value)}
                className="flex-1 border dark:border-gray-600 p-2 rounded
                           bg-white dark:bg-gray-700
                           text-gray-900 dark:text-white"
                placeholder="Type your answer..."
              />

              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
              >
                Send
              </button>

              <button
                onClick={() => socket.emit("endInterview")}
                className="bg-red-500 text-white px-4 rounded hover:bg-red-600"
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
