import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import FileUploadSection from "../components/layout/FileUploadSection";
import ParameterSection from "../components/layout/ParameterSection";
import { pageVariants, containerVariants, sectionVariants } from "../lib/animations";
import {
  ensureSubject,
  downloadReportFileByOutputId,
  getConfiguration,
  getSubjectReports,
  getSubjectStatus,
  getSubjects,
  processPhase3,
  saveConfiguration,
} from "../lib/api";

const subjectCatalog = {
  CS301: { name: "Database Management Systems", semester: "Semester V" },
  CS302: { name: "Design and Analysis of Algorithms", semester: "Semester V" },
  CS401: { name: "Machine Learning", semester: "Semester VII" },
  CS403: { name: "Compiler Design", semester: "Semester VII" },
  IT305: { name: "Software Engineering", semester: "Semester V" },
  IT407: { name: "Cloud Computing", semester: "Semester VII" },
};

const workflowSteps = [
  { id: 1, label: "Early-sem" },
  { id: 2, label: "Mid-sem" },
  { id: 3, label: "End-sem" },
];

const stageFiles = {
  1: ["CAT1_QP", "CAT1_MARKS", "ASS1"],
  2: ["CAT2_QP", "CAT2_MARKS", "ASS2"],
  3: ["TERMINAL_QP", "TERMINAL", "CAT1_REPORT", "CAT2_REPORT"],
};

const allUploadKeys = Object.values(stageFiles).flat();

function getActiveStage(files = {}) {
  const earlyComplete = stageFiles[1].every((key) => files[key]);
  const midComplete = stageFiles[2].every((key) => files[key]);

  if (!earlyComplete) {
    return 1;
  }
  if (!midComplete) {
    return 2;
  }
  return 3;
}

export default function SubjectWorkspace({ user }) {
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [parameters, setParameters] = useState({});
  const [step, setStep] = useState(1);
  const [saveMessage, setSaveMessage] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState(null);
  const [generatingFinal, setGeneratingFinal] = useState(false);
  const [openSections, setOpenSections] = useState({
    upload: true,
    parameter: false,
  });

  const { subjectCode } = useParams();
  const resolvedSubjectCode = subjectCode || "SUBJECT";
  const details =
    subjects.find((subject) => subject.code === resolvedSubjectCode) ||
    subjectCatalog[resolvedSubjectCode] || {
      name: "Subject Name",
      semester: "Semester",
    };
  const activeStage = getActiveStage(uploadedFiles);
  const uploadSectionCompleted = allUploadKeys.every((key) => uploadedFiles[key]);

  const endFilesReady = stageFiles[3].every((key) => uploadedFiles[key]);

  async function downloadLatestReportByType(outputType, fallbackName) {
    const reports = await getSubjectReports(subjectId);
    const target = reports.find((report) => report.type === outputType);

    if (!target?.id) {
      throw new Error(`No ${fallbackName} is available for download yet.`);
    }

    const { blob } = await downloadReportFileByOutputId(target.id, outputType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resolvedSubjectCode}_${fallbackName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleGenerateFinal() {
    if (!subjectId || !subjectCode || !endFilesReady) {
      return;
    }

    setGeneratingFinal(true);
    setSaveMessage("");

    try {
      await processPhase3(subjectId);
      await downloadLatestReportByType("CO_ATTAINMENT_COMPLETE", "END_SEM_REPORT");
      setStep(4);
      setSaveMessage("End-sem report generated and downloaded.");
    } catch (error) {
      setSaveMessage(error.message || "Failed to generate end-sem report.");
    } finally {
      setGeneratingFinal(false);
    }
  }

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await getSubjects();
        setSubjects(data || []);
      } catch {
        setSubjects([]);
      }
    }

    loadSubjects();
  }, []);

  useEffect(() => {
    async function bootstrapSubjectWorkspace() {
      if (!subjectCode) {
        return;
      }

      try {
        const subject = await ensureSubject(subjectCode);
        setSubjectId(subject.id);

        const status = await getSubjectStatus(subject.id);
        const nextUploaded = {
          CAT1_QP: status.files?.some((file) => file.file_type === "CAT1_QP") || false,
          CAT1_MARKS: status.files?.some((file) => file.file_type === "CAT1_MARKS") || false,
          CAT2_QP: status.files?.some((file) => file.file_type === "CAT2_QP") || false,
          CAT2_MARKS: status.files?.some((file) => file.file_type === "CAT2_MARKS") || false,
          ASS1: status.files?.some((file) => file.file_type === "ASS1") || false,
          ASS2: status.files?.some((file) => file.file_type === "ASS2") || false,
          TERMINAL_QP: status.files?.some((file) => file.file_type === "TERMINAL_QP") || false,
          TERMINAL: status.files?.some((file) => file.file_type === "TERMINAL") || false,
          CAT1_REPORT: status.files?.some((file) => file.file_type === "CAT1_REPORT") || false,
          CAT2_REPORT: status.files?.some((file) => file.file_type === "CAT2_REPORT") || false,
        };
        setUploadedFiles(nextUploaded);

        let restoredStep = 1;
        if (status.current_phase >= 3) {
          restoredStep = 4;
        } else if (status.current_phase >= 2) {
          restoredStep = 3;
        } else if (status.current_phase >= 1) {
          restoredStep = 2;
        }

        try {
          const config = await getConfiguration(subject.id);
          const restoredParameters = {
            ep: String(config.ep ?? ""),
            constraint: String(config.constraint ?? ""),
            ela: {
              CO1: String(config?.ela?.CO1 ?? ""),
              CO2: String(config?.ela?.CO2 ?? ""),
              CO3: String(config?.ela?.CO3 ?? ""),
              CO4: String(config?.ela?.CO4 ?? ""),
              CO5: String(config?.ela?.CO5 ?? ""),
              CO6: String(config?.ela?.CO6 ?? ""),
            },
          };

          setParameters(restoredParameters);
        } catch {
          // Keep UI defaults when configuration is not yet available.
        }

        setStep(restoredStep);
        setOpenSections({
          upload: restoredStep <= 1,
          parameter: restoredStep === 2,
        });
      } catch {
        setSaveMessage("Unable to load workspace state.");
      }
    }

    bootstrapSubjectWorkspace();
  }, [subjectCode]);

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="flex flex-wrap items-center justify-between gap-3"
        variants={sectionVariants}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Subject Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-red-950">
            {resolvedSubjectCode} - {details.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{details.semester}</p>
          <p className="mt-2 text-sm text-slate-600">
            Manage Early-sem, Mid-sem, and End-sem files, configure CO parameters, and download stage reports.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="rounded-xl border border-red-100 bg-white p-3 shadow-[0_8px_20px_-20px_rgba(127,29,29,0.65)]"
        variants={sectionVariants}
      >
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((item) => {
            const isActive = activeStage === item.id;
            const isCompleted = activeStage > item.id;

            return (
              <motion.li
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors duration-300 ${
                  isCompleted
                    ? "border-red-200 bg-red-100/70 text-red-900"
                    : isActive
                    ? "border-red-300 bg-white text-red-800 shadow-sm"
                    : "border-slate-200 bg-white/70 text-slate-500"
                }`}
                layout
                transition={{ duration: 0.25 }}
              >
                <motion.span
                  className={`step-badge grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    isCompleted || isActive
                      ? "bg-red-700 text-white active"
                      : "bg-slate-200 text-slate-600"
                  }`}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted || isActive ? "#b91c1c" : "#e2e8f0",
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? "?" : item.id}
                </motion.span>
                <span className="font-medium leading-tight">{item.label}</span>

                {isActive && (
                  <motion.span
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </motion.li>
            );
          })}
        </ol>
      </motion.div>

      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <FileUploadSection
          isOpen={openSections.upload}
          completed={uploadSectionCompleted}
          uploadedFiles={uploadedFiles}
          user={user}
          subjectId={subjectId}
          subjectCode={resolvedSubjectCode}
          onToggle={() =>
            setOpenSections((prev) => ({
              ...prev,
              upload: !prev.upload,
            }))
          }
          onUploadChange={(files) => {
            setUploadedFiles(files);
            let nextStep = step;

            if (Object.values(files).filter(Boolean).length === 8 && nextStep < 2) {
              nextStep = 2;
            }

            if (nextStep === 2) {
              setStep(2);
              setOpenSections((prev) => ({
                ...prev,
                upload: false,
                parameter: true,
              }));
            } else if (nextStep === 4) {
              setStep(4);
              setOpenSections((prev) => ({
                ...prev,
                upload: false,
                parameter: false,
              }));
            }
          }}
        />

        <ParameterSection
          isOpen={openSections.parameter}
          completed={step > 2}
          initialValues={parameters}
          onToggle={() =>
            setOpenSections((prev) => ({
              ...prev,
              parameter: !prev.parameter,
            }))
          }
          canGenerateFinal={endFilesReady && step >= 3 && !!subjectId}
          isGeneratingFinal={generatingFinal}
          onComplete={(values) => {
            if (!subjectId) {
              setSaveMessage("Subject is not ready yet. Please try again.");
              return;
            }

            setParameters(values);
            setStep(3);

            saveConfiguration(subjectId, {
              ep: values.ep,
              constraint: values.constraint,
              ela: values.ela,
            })
              .then(() => setSaveMessage("Parameters saved."))
              .catch((error) => setSaveMessage(error.message || "Failed to save parameters."));
          }}
          onGenerateFinal={handleGenerateFinal}
        />

        {saveMessage ? <p className="text-xs text-slate-500">{saveMessage}</p> : null}
      </motion.div>
    </motion.div>
  );
}
