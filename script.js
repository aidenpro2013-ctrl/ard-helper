(function () {
  // Mobile menu
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Checklist persistence
  const STORAGE_KEY = "ard-helper-checklist";

  function loadChecks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb, i) => {
        if (saved[i]) cb.checked = true;
      });
    } catch (_) {}
  }

  function saveChecks() {
    const state = {};
    document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb, i) => {
      state[i] = cb.checked;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", saveChecks);
  });

  loadChecks();

  // Clear button
  const clearBtn = document.getElementById("clear-checklist");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.querySelectorAll('.checklist input[type="checkbox"]').forEach((cb) => {
        cb.checked = false;
      });
      localStorage.removeItem(STORAGE_KEY);
    });
  }

  // Print button
  const printBtn = document.getElementById("print-checklist");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // ========== ARD AI Assistant ==========
  const agentToggle = document.getElementById("agent-toggle");
  const agentPanel = document.getElementById("agent-panel");
  const agentClose = document.getElementById("agent-close");
  const agentMessages = document.getElementById("agent-messages");
  const agentForm = document.getElementById("agent-form");
  const agentInput = document.getElementById("agent-input");

  if (!agentToggle || !agentPanel) return;

  const knowledge = [
    {
      keywords: ["hello", "hi", "hey", "start", "help"],
      reply:
        "Hi! I’m the ARD Assistant. I can help with:\n\n• What an ARD is\n• Your parent rights\n• Preparing for the meeting\n• What to bring\n• Questions to ask\n• Recording the meeting\n• After the ARD\n\nWhat would you like to know?"
    },
    {
      keywords: ["what is ard", "what is an ard", "define ard", "ard mean", "admission review"],
      reply:
        "ARD stands for Admission, Review, and Dismissal.\n\nIt’s the Texas committee meeting where parents and school staff decide if a child qualifies for special education and what the IEP (Individualized Education Program) should include.\n\n• Admission – eligibility\n• Review – progress & updates (at least yearly)\n• Dismissal – exiting special education\n\nYou are a full, equal member of the committee."
    },
    {
      keywords: ["right", "rights", "my rights", "parent rights", "procedural"],
      reply:
        "Key rights you have under IDEA and Texas law:\n\n• Written notice of the ARD at least 5 school days ahead\n• Full participation as a committee member\n• Review your child’s educational records\n• Bring an advocate, friend, or attorney\n• Request an Independent Educational Evaluation (IEE) if you disagree with the school’s evaluation\n• Disagree in writing and have it recorded\n• Receive a free copy of the IEP\n• Audio-record the meeting (Texas is generally one-party consent; advance notice is best practice)\n\nScroll to “Your core rights” on this page for more detail."
    },
    {
      keywords: ["record", "recording", "audio", "tape", "24 hour", "24-hour"],
      reply:
        "Yes — in Texas you may generally audio-record an ARD meeting under one-party consent law (you only need your own consent).\n\nBest practice: Send the school short written notice in advance (email is fine). This reduces the chance of objections or a request to reschedule.\n\nSample wording:\n“I plan to audio-record our ARD meeting scheduled for [date] at [time] for my personal documentation.”\n\nYou are responsible for your own recording device. If the school objects, stay calm and refer to your right to document the meeting."
    },
    {
      keywords: ["prepare", "preparation", "checklist", "before the meeting", "get ready"],
      reply:
        "Before the ARD:\n\n1. Request and review records (evaluations, progress reports, current IEP)\n2. Write down your top concerns and questions\n3. Gather outside docs (medical reports, private evaluations, therapy notes, work samples)\n4. List strengths as well as needs\n5. Draft goals or accommodations you want discussed\n6. Invite a support person if you want one\n7. If you plan to record, consider sending advance written notice\n8. Ask for the agenda in advance\n\nUse the interactive checklist on this page — it saves as you check items."
    },
    {
      keywords: ["bring", "what to bring", "documents", "paperwork"],
      reply:
        "Bring to the meeting:\n\n• Current IEP and most recent evaluation\n• Progress reports and work samples\n• Private evaluations or medical documentation\n• Your written list of concerns and questions\n• Notebook or device for notes\n• Copy of any recording notice you sent (if you provided one)\n\nHaving documents ready helps the discussion stay focused on data."
    },
    {
      keywords: ["question", "questions to ask", "what should i ask", "ask the school"],
      reply:
        "Strong questions to ask:\n\n1. How is my child progressing on last year’s IEP goals? (ask for numbers)\n2. What do the evaluation data show about present levels?\n3. Are the proposed goals measurable and realistic?\n4. What services, minutes, and accommodations are recommended — and why?\n5. How will progress be monitored and how often will I get reports?\n6. Is this the least restrictive environment appropriate for my child?\n7. Can we put the agreed supports in writing before we leave?\n\nVague words like “support” or “monitor” should be clarified."
    },
    {
      keywords: ["after", "after the meeting", "sign", "signing", "disagree"],
      reply:
        "After the ARD:\n\n• Review the final IEP carefully before signing\n• Make sure every agreed service or accommodation is written in the document\n• Note the next review date\n• Keep a complete copy in your home file\n• Follow up in writing on any open items\n\nYou can disagree in writing. Clarify what your signature means if you are only agreeing to parts of the plan."
    },
    {
      keywords: ["iee", "independent evaluation", "independent educational"],
      reply:
        "If you disagree with the school’s evaluation, you can request an Independent Educational Evaluation (IEE) at public expense in many cases.\n\nPut the request in writing. The school must either agree to pay or start a due-process hearing to defend its own evaluation.\n\nAn IEE can give you another expert opinion to bring into the next ARD."
    },
    {
      keywords: ["iep", "what is iep", "individualized"],
      reply:
        "The IEP (Individualized Education Program) is the legal document the ARD committee writes.\n\nIt must include:\n• Present levels of academic achievement and functional performance (PLAAFP)\n• Measurable annual goals\n• Special education and related services\n• Accommodations and modifications\n• Placement / least restrictive environment decisions\n• How progress will be measured and reported\n\nIf it’s not written in the IEP, it is not guaranteed."
    },
    {
      keywords: ["advocate", "support person", "bring someone", "attorney", "lawyer"],
      reply:
        "You have the right to bring anyone with knowledge of your child — an advocate, friend, relative, or attorney.\n\nMany parents find that having another adult in the room helps them stay calm and take better notes. You do not need the school’s permission to bring a support person."
    },
    {
      keywords: ["notice", "5 day", "five day", "invitation"],
      reply:
        "The school must give you written notice of an ARD meeting at least 5 school days in advance, unless you agree to meet sooner.\n\nThe notice should include the purpose, time, location, and who will attend. If you need a different time or more preparation time, ask in writing."
    },
    {
      keywords: ["resource", "spedtex", "tea", "official", "where to learn more"],
      reply:
        "Trusted free resources:\n\n• Parent’s Guide to the ARD Process (SPEDTex / TEA) — official explanation of rights and process\n• SPEDTex.org — Texas Special Education Information Center\n• ARD Meeting Prep Sheet on SPEDTex\n• Texas Education Agency Special Education pages\n\nLinks are in the Resources section of this site."
    },
    {
      keywords: ["least restrictive", "lre", "placement", "inclusion"],
      reply:
        "Placement decisions must start with the least restrictive environment (LRE).\n\nThat means considering the general education classroom first, with supports, before moving to more restrictive settings. Ask the team to explain why any proposed placement is appropriate and what supports would allow more time in general education."
    },
    {
      keywords: ["goal", "goals", "measurable"],
      reply:
        "Good IEP goals are measurable. They should state:\n\n• What the student will do\n• Under what conditions\n• How success will be measured (e.g., “with 80% accuracy in 4 out of 5 trials”)\n\nVague goals like “will improve reading” are hard to track. Ask for specific baselines and criteria."
    }
  ];

  const fallback =
    "I’m not sure I fully understood that. Try asking about:\n\n• What an ARD is\n• Your rights\n• Preparing / checklist\n• What to bring\n• Questions to ask\n• Recording the meeting\n• After the ARD / signing\n• IEE or IEP basics\n\nOr scroll the page — the full guides are right here.";

  function normalize(text) {
    return text.toLowerCase().replace(/[’']/g, "'").trim();
  }

  function getReply(userText) {
    const q = normalize(userText);
    if (!q) return "Please type a question and I’ll do my best to help.";

    let best = null;
    let bestScore = 0;

    for (const item of knowledge) {
      let score = 0;
      for (const kw of item.keywords) {
        if (q.includes(kw)) score += kw.length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore > 0 ? best.reply : fallback;
  }

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = "agent-msg " + who;
    div.textContent = text;
    agentMessages.appendChild(div);
    agentMessages.scrollTop = agentMessages.scrollHeight;
  }

  function showTyping(show) {
    let el = document.getElementById("agent-typing");
    if (show) {
      if (!el) {
        el = document.createElement("div");
        el.id = "agent-typing";
        el.className = "agent-typing";
        el.textContent = "ARD Assistant is typing…";
        agentMessages.appendChild(el);
      }
    } else if (el) {
      el.remove();
    }
    agentMessages.scrollTop = agentMessages.scrollHeight;
  }

  function openPanel() {
    agentPanel.hidden = false;
    agentToggle.setAttribute("aria-expanded", "true");
    if (agentMessages.children.length === 0) {
      addMessage(
        "Hi! I’m here to help you prepare for ARD meetings in Texas. Ask me anything about rights, checklists, questions to ask, recording, or the process.",
        "bot"
      );
    }
    agentInput.focus();
  }

  function closePanel() {
    agentPanel.hidden = true;
    agentToggle.setAttribute("aria-expanded", "false");
  }

  agentToggle.addEventListener("click", () => {
    if (agentPanel.hidden) openPanel();
    else closePanel();
  });

  agentClose.addEventListener("click", closePanel);

  agentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = agentInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    agentInput.value = "";
    showTyping(true);

    setTimeout(() => {
      showTyping(false);
      addMessage(getReply(text), "bot");
    }, 450 + Math.random() * 350);
  });
})();
