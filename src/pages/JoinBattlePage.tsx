import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useGame } from "../context/GameContext";
import { CheckCircle, AlertCircle } from "lucide-react";
import { getDeviceFingerprint } from "../utils/deviceFingerprint";

const JoinBattlePage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formStatus, setFormStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { registerDotForBattle, registrationStatus, nextBattleTime } = useGame();
  const navigate = useNavigate();
  const isRegistrationOpen = registrationStatus === "open";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isRegistrationOpen) {
      setFormStatus("error");
      if (registrationStatus === "full") {
        setErrorMessage("The battle is full. Please try again tomorrow!");
      } else if (registrationStatus === "closed") {
        setErrorMessage(
          "Registration is currently closed during an active battle."
        );
      } else {
        setErrorMessage("Registration is not currently available.");
      }
      return;
    }

    if (!name.trim()) {
      setFormStatus("error");
      setErrorMessage("Please enter a name for your dot.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setFormStatus("error");
      setErrorMessage(
        "Name can only contain letters, numbers, and underscores."
      );
      return;
    }

    const dotName = name.startsWith("Dot_") ? name : `Dot_${name}`;
    const deviceId = getDeviceFingerprint();

    setFormStatus("submitting");

    try {
      const result = await registerDotForBattle(dotName, deviceId);

      if (result.success) {
        setFormStatus("success");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setFormStatus("error");
        setErrorMessage(result.message);
      }
    } catch (error) {
      setFormStatus("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Join The Dot Games
            </h1>
            <p className="text-lg text-gray-300">
              Register your dot for the next battle and compete for glory!
            </p>
          </div>

          <div className="bg-gray-800 bg-opacity-70 rounded-lg p-6 md:p-8 border border-gray-700 shadow-xl">
            {/* Registration status indicator */}
            <div
              className={`mb-6 p-4 rounded-lg ${
                isRegistrationOpen
                  ? "bg-green-900 bg-opacity-20 border border-green-700"
                  : "bg-red-900 bg-opacity-20 border border-red-700"
              }`}
            >
              <div className="flex items-center">
                {isRegistrationOpen ? (
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                )}
                <span
                  className={
                    isRegistrationOpen ? "text-green-400" : "text-red-400"
                  }
                >
                  {registrationStatus === "open" &&
                    "Registration is open for the next battle!"}
                  {registrationStatus === "full" &&
                    "Tonight's battle is full! Registration opens tomorrow."}
                  {registrationStatus === "closed" &&
                    "Registration is currently closed during an active battle."}
                </span>
              </div>
              {nextBattleTime && (
                <div className="mt-2 text-sm text-gray-400">
                  Next battle starts: {nextBattleTime.toLocaleDateString()} at{" "}
                  {nextBattleTime.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Success state - shown after successful registration */}
            {formStatus === "success" ? (
              <div className="text-center py-10">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Registration Successful!
                </h2>
                <p className="text-gray-300 mb-4">
                  Your dot has been registered for the next battle.
                </p>
                <p className="text-sm text-gray-400">
                  Redirecting you to the battle arena...
                </p>
              </div>
            ) : (
              /* Registration form */
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Register Your Dot
                  </h2>

                  <Input
                    label="Dot Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name or handle (e.g. JaneDoe)"
                    fullWidth
                    required
                    maxLength={20}
                  />

                  <div className="text-xs text-gray-400 mt-1 mb-6">
                    "Dot_" will be automatically added to your name if you don't
                    include it.
                  </div>

                  <Input
                    label="Email (Optional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For notifications when your dot wins"
                    fullWidth
                  />
                </div>

                {/* Error message display */}
                {formStatus === "error" && (
                  <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded text-red-400 text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* Submit button - disabled when submitting or registration closed */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={formStatus === "submitting" || !isRegistrationOpen}
                >
                  {formStatus === "submitting"
                    ? "Registering..."
                    : "Register for Battle"}
                </Button>

                <div className="mt-6 text-center text-sm text-gray-400">
                  <p>
                    By registering, you agree to our imaginary terms of service
                    and confirm that your dot is ready to battle!
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* How it works section - unchanged as it's still accurate */}
          <div className="mt-10 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700">
                <div className="text-cyan-400 text-xl font-bold mb-2">1</div>
                <h4 className="text-white font-medium mb-2">
                  Register Your Dot
                </h4>
                <p className="text-gray-400 text-sm">
                  Enter your name and join the battle royale as a unique dot.
                </p>
              </div>

              <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700">
                <div className="text-cyan-400 text-xl font-bold mb-2">2</div>
                <h4 className="text-white font-medium mb-2">
                  Watch the Battle
                </h4>
                <p className="text-gray-400 text-sm">
                  Every night at 11:00 PM ET, dots face off in an epic battle.
                </p>
              </div>

              <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700">
                <div className="text-cyan-400 text-xl font-bold mb-2">3</div>
                <h4 className="text-white font-medium mb-2">Claim Victory</h4>
                <p className="text-gray-400 text-sm">
                  The last dot standing wins and earns a place on the
                  leaderboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinBattlePage;