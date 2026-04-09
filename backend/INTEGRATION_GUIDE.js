/*
Node.js Integration Helper
Usage Examples and Boilerplate for calling Python stages from Express.js
*/

// ============================================================================
// EXAMPLE 1: Basic Child Process Wrapper
// ============================================================================

const { spawn } = require('child_process');
const path = require('path');

async function runPythonStage(scriptName, args) {
  const scriptPath = path.join(__dirname, 'python', scriptName);

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [scriptPath, JSON.stringify(args)]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python error: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Invalid JSON from Python: ${stdout}`));
      }
    });
  });
}


// ============================================================================
// EXAMPLE 2: Express Route - Stage 1 (Upload Question Paper)
// ============================================================================

router.post('/stage1/upload', upload.single('docx'), async (req, res) => {
  try {
    const docxPath = req.file.path;  // e.g., /uploads/qp_20240409_xyz.docx
    const outputPath = `/outputs/QP_FINAL_${Date.now()}.xlsx`;

    const result = await runPythonStage('stage1_qp.py', {
      docx_path: docxPath,
      output_path: outputPath
    });

    if (result.status === 'error') {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      status: 'success',
      output_path: result.output_path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// EXAMPLE 3: Express Route - Stage 2 (Inject Student Marks)
// ============================================================================

router.post('/stage2/inject-marks', upload.single('marks'), async (req, res) => {
  try {
    const { qp_path } = req.body;  // Path to QP_FINAL.xlsx from Stage 1
    const marksPath = req.file.path;  // CAMU export Excel

    const result = await runPythonStage('stage2_marks.py', {
      qp_excel_path: qp_path,
      student_db_path: marksPath
    });

    if (result.status === 'error') {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      status: 'success',
      output_path: result.output_path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// EXAMPLE 4: Express Route - Stage 3 (Consolidate Master Template)
// ============================================================================

router.post('/stage3/consolidate', async (req, res) => {
  try {
    const {
      template_path,
      cat1_path,
      cat2_path,
      ass1_path,
      ass2_path
    } = req.body;

    const outputPath = `/outputs/CO_ATTAINMENT_FINAL_${Date.now()}.xlsx`;

    const result = await runPythonStage('stage3_consolidate.py', {
      template_path,
      cat1_path,
      cat2_path,
      ass1_path,
      ass2_path,
      output_path: outputPath
    });

    if (result.status === 'error') {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      status: 'success',
      output_path: result.output_path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// EXAMPLE 5: Express Route - Stage 4 (Final Attainment Calculation)
// ============================================================================

router.post('/stage4/calculate-attainment', async (req, res) => {
  try {
    const {
      co_attainment_path,
      terminal_path,
      ep,
      constraint,
      ela
    } = req.body;

    // Validate ELA object
    const requiredCOs = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'];
    for (const co of requiredCOs) {
      if (!(co in ela)) {
        return res.status(400).json({
          error: `Missing ELA value for ${co}`
        });
      }
    }

    const outputPath = `/outputs/CO_ATTAINMENT_COMPLETE_${Date.now()}.xlsx`;

    const result = await runPythonStage('stage4_attainment.py', {
      co_attainment_path,
      terminal_path,
      output_path: outputPath,
      ep: parseFloat(ep),
      constraint: parseFloat(constraint),
      ela
    });

    if (result.status === 'error') {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      status: 'success',
      output_path: result.output_path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// EXAMPLE 6: Frontend Form Data (React Example)
// ============================================================================

// Stage 4 form submission
const handleStage4Submit = async (formData) => {
  const payload = {
    co_attainment_path: formData.coAttainmentPath,
    terminal_path: formData.terminalPath,
    ep: formData.ep,  // e.g., 80
    constraint: formData.constraint,  // e.g., 79.99
    ela: {
      CO1: formData.elaCO1,  // e.g., 75
      CO2: formData.elaCO2,
      CO3: formData.elaCO3,
      CO4: formData.elaCO4,
      CO5: formData.elaCO5,
      CO6: formData.elaCO6
    }
  };

  const response = await fetch('/api/stage4/calculate-attainment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  return result;
};


// ============================================================================
// EXAMPLE 7: Error Handling & Retry Logic
// ============================================================================

async function runPythonStageWithRetry(scriptName, args, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Running ${scriptName}`);
      return await runPythonStage(scriptName, args);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}


// ============================================================================
// EXAMPLE 8: Complete Pipeline (All Stages in Sequence)
// ============================================================================

router.post('/pipeline/complete', async (req, res) => {
  try {
    const {
      docx_path,
      camu_marks_path,
      template_path,
      ass1_path,
      ass2_path,
      terminal_path,
      ep,
      constraint,
      ela
    } = req.body;

    console.log('Starting complete CO Attainment pipeline...');

    // Stage 1: Parse Question Paper
    console.log('Stage 1: Parsing question paper...');
    const qpResult = await runPythonStage('stage1_qp.py', {
      docx_path,
      output_path: `/outputs/QP_FINAL_${Date.now()}.xlsx`
    });

    if (qpResult.status === 'error') throw new Error(qpResult.message);
    const qpPath = qpResult.output_path;
    console.log('Stage 1 complete:', qpPath);

    // Stage 2: Inject Student Marks
    console.log('Stage 2: Injecting student marks...');
    const marksResult = await runPythonStage('stage2_marks.py', {
      qp_excel_path: qpPath,
      student_db_path: camu_marks_path
    });

    if (marksResult.status === 'error') throw new Error(marksResult.message);
    const cat1Path = marksResult.output_path;
    console.log('Stage 2 complete:', cat1Path);

    // Note: CAT2 would follow similar Stage 1+2 flow
    // For demo, we assume cat2_path is provided

    // Stage 3: Consolidate Master Template
    console.log('Stage 3: Consolidating master template...');
    const consolidateResult = await runPythonStage('stage3_consolidate.py', {
      template_path,
      cat1_path,
      cat2_path: req.body.cat2_path,  // Assume provided
      ass1_path,
      ass2_path,
      output_path: `/outputs/CO_ATTAINMENT_FINAL_${Date.now()}.xlsx`
    });

    if (consolidateResult.status === 'error') throw new Error(consolidateResult.message);
    const coAttainmentPath = consolidateResult.output_path;
    console.log('Stage 3 complete:', coAttainmentPath);

    // Stage 4: Calculate Final Attainment
    console.log('Stage 4: Calculating final attainment...');
    const attainmentResult = await runPythonStage('stage4_attainment.py', {
      co_attainment_path: coAttainmentPath,
      terminal_path,
      output_path: `/outputs/CO_ATTAINMENT_COMPLETE_${Date.now()}.xlsx`,
      ep: parseFloat(ep),
      constraint: parseFloat(constraint),
      ela
    });

    if (attainmentResult.status === 'error') throw new Error(attainmentResult.message);
    const finalPath = attainmentResult.output_path;
    console.log('Stage 4 complete:', finalPath);

    res.json({
      status: 'success',
      message: 'Pipeline complete',
      final_output: finalPath,
      intermediate_files: {
        qp: qpPath,
        cat1: cat1Path,
        co_attainment: coAttainmentPath
      }
    });

  } catch (error) {
    console.error('Pipeline failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});


// ============================================================================
// NOTES FOR EXPRESS SETUP
// ============================================================================

/*
1. Install dependencies:
   npm install multer express

2. Ensure Python 3 is installed:
   python3 --version

3. Install Python dependencies:
   pip3 install -r python/requirements.txt

4. Ensure Tesseract OCR is installed (Linux example):
   sudo apt install tesseract-ocr

5. Set up file paths:
   - /uploads - where user files are stored temporarily
   - /outputs - where generated Excel files are saved
   - /python - where stage scripts are located

6. Configure file upload size limits in Express:
   app.use(express.json({ limit: '50mb' }));

7. For production:
   - Use absolute file paths
   - Implement file cleanup (delete old temp files)
   - Add proper authentication/authorization
   - Log all processing stages
   - Consider containerizing with Docker
*/
