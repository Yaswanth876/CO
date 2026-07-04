const fs = require('fs');
let code = fs.readFileSync('routes/reports.js', 'utf8');

// 1. Remove IntermediateOutput from imports
code = code.replace('IntermediateOutput, ', '');

// 2. Rewrite GET /api/reports/:subject_id
const getSubjectIdRouteOld = `    const outputs = await IntermediateOutput.findAll({
      where: { subject_id },
      order: [['created_at', 'DESC']]
    });

    const reports = outputs.map(o => ({
      id: o.id,
      stage: o.stage_number,
      type: o.output_type,
      file_path: o.file_path,
      generated_at: o.created_at,
      file_exists: fileExists(o.file_path),
      download_url: \`/api/reports/download/\${o.id}\`
    }));`;

const getSubjectIdRouteNew = `    const reportRecords = await Report.findAll({
      where: { course_id: subject_id },
      order: [['generated_at', 'DESC']]
    });

    const reports = reportRecords.map(r => {
      let mappedType = 'UNKNOWN';
      if (r.report_name.includes('EARLY_SEM_REPORT')) mappedType = 'EARLY_SEM_REPORT';
      else if (r.report_name.includes('MID_SEM_REPORT')) mappedType = 'MID_SEM_REPORT';
      else if (r.report_name.includes('TERMINAL_REPORT')) mappedType = 'CO_ATTAINMENT_COMPLETE';
      
      return {
        id: r.id,
        stage: mappedType === 'EARLY_SEM_REPORT' ? 1 : mappedType === 'MID_SEM_REPORT' ? 2 : 3,
        type: mappedType,
        file_path: r.report_file_path,
        generated_at: r.generated_at,
        file_exists: fileExists(r.report_file_path),
        download_url: \`/api/reports/download-file/\${r.id}\`
      };
    });`;

code = code.replace(getSubjectIdRouteOld, getSubjectIdRouteNew);

// 3. Rewrite GET /latest/:subject_id/:output_type
const getLatestOld = `    const output = await IntermediateOutput.findOne({
      where: { subject_id, output_type },
      order: [['created_at', 'DESC']]
    });`;

const getLatestNew = `    let searchName = '';
    if (output_type === 'EARLY_SEM_REPORT') searchName = 'EARLY_SEM_REPORT';
    else if (output_type === 'MID_SEM_REPORT') searchName = 'MID_SEM_REPORT';
    else if (output_type === 'CO_ATTAINMENT_COMPLETE') searchName = 'TERMINAL_REPORT';

    const output = await Report.findOne({
      where: { course_id: subject_id, report_name: { [require('sequelize').Op.like]: \`%\${searchName}%\` } },
      order: [['generated_at', 'DESC']]
    });
    
    // Map properties for frontend compatibility
    if (output) {
      output.output_type = output_type;
      output.file_path = output.report_file_path;
      output.created_at = output.generated_at;
    }`;

code = code.replace(getLatestOld, getLatestNew);

// 4. Rewrite GET /download/:id
const getDownloadIdOld = `    const output = await IntermediateOutput.findByPk(id, {
      include: [{
        association: 'subject',
        model: Subject,
        attributes: ['id', 'user_id']
      }]
    });`;

const getDownloadIdNew = `    const output = await Report.findByPk(id, {
      include: [{
        association: 'course',
        model: Subject,
        attributes: ['id', 'user_id']
      }]
    });
    if (output) {
      output.subject = output.course;
      output.file_path = output.report_file_path;
      output.output_type = output.report_name.includes('EARLY_SEM') ? 'EARLY_SEM_REPORT' : output.report_name.includes('MID_SEM') ? 'MID_SEM_REPORT' : 'CO_ATTAINMENT_COMPLETE';
    }`;

code = code.replace(getDownloadIdOld, getDownloadIdNew);

// 5. Rewrite GET /download/:subject_id/:output_type
const getDownloadSubOld = `    const output = await IntermediateOutput.findOne({
      where: { subject_id, output_type },
      order: [['created_at', 'DESC']]
    });`;

const getDownloadSubNew = `    let searchName = '';
    if (output_type === 'EARLY_SEM_REPORT') searchName = 'EARLY_SEM_REPORT';
    else if (output_type === 'MID_SEM_REPORT') searchName = 'MID_SEM_REPORT';
    else if (output_type === 'CO_ATTAINMENT_COMPLETE') searchName = 'TERMINAL_REPORT';

    const output = await Report.findOne({
      where: { course_id: subject_id, report_name: { [require('sequelize').Op.like]: \`%\${searchName}%\` } },
      order: [['generated_at', 'DESC']]
    });
    if (output) {
      output.file_path = output.report_file_path;
    }`;

code = code.replace(getDownloadSubOld, getDownloadSubNew);

// 6. Rewrite POST /clear-process/:subject_id
const clearOld = `    const outputs = await IntermediateOutput.findAll({
      where: { subject_id }
    });

    for (const output of outputs) {
      if (output.file_path && fileExists(output.file_path)) {
        try {
          fs.unlinkSync(output.file_path);
        } catch (error) {
          // Ignore missing/delete failures and continue cleaning metadata.
        }
      }
    }

    await IntermediateOutput.destroy({
      where: { subject_id }
    });`;

const clearNew = `    // IntermediateOutputs no longer exist. Just clean up Reports.
    const outputs = await Report.findAll({
      where: { course_id: subject_id }
    });
    for (const output of outputs) {
      if (output.report_file_path && fileExists(output.report_file_path)) {
        try { fs.unlinkSync(output.report_file_path); } catch (e) {}
      }
    }`;

code = code.replace(clearOld, clearNew);

fs.writeFileSync('routes/reports.js', code);
console.log('Patch complete');
