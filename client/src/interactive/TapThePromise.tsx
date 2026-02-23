import { useState, useEffect } from "react";

const promises = [
  { text: "Trust in the Lord with all your heart", ref: "Proverbs 3:5" },
  { text: "By grace you have been saved", ref: "Ephesians 2:8" },
  { text: "I can do all things through Christ", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd", ref: "Psalm 23:1" },
  { text: "Walk by the Spirit", ref: "Galatians 5:16" },
  { text: "Do not fear, for I am with you", ref: "Isaiah 41:10" },
  { text: "Come to me, all who are weary", ref: "Matthew 11:28" },
];

const animations = ["from-right", "from-left", "from-top"];

export default function TapThePromise() {
  const [index, setIndex] = useState(0);
  const [activated, setActivated] = useState(0);
  const [animation, setAnimation] = useState("from-right");

  useEffect(() => {
    if (index >= promises.length) return;

    const anim = animations[Math.floor(Math.random() * animations.length)];
    setAnimation(anim);

    const timer = setTimeout(() => {
      setActivated(index + 1);
      setIndex((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [index]);

  if (index >= promises.length) {
    return (
      <div className="tap-container" data-testid="tap-promise-complete">
        <h2>All Promises Activated 🎉</h2>
      </div>
    );
  }

  const current = promises[index];

  return (
    <div className="tap-container" data-testid="tap-promise-container">
      <div className="counter" data-testid="tap-promise-counter">
        Promises Activated: {activated} / {promises.length}
      </div>

      <div className={`card ${animation}`} data-testid="tap-promise-card">
        <h1>{current.text}</h1>
        <p>({current.ref})</p>
      </div>
    </div>
  );
}
