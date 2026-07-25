const db = require('../config/database');

/**
 * Fetch list of leads under visibility constraints
 * - Managers / TLs: Full visibility
 * - Staff: Assigned leads only
 */
const getLeads = async (req, res) => {
  const { role, id } = req.user;
  const { status, search } = req.query;

  try {
    let query = `
      SELECT l.*, u.name AS assigned_staff_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_staff_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (role === 'staff') {
      conditions.push(`l.assigned_staff_id = $${params.length + 1}`);
      params.push(id);
    }

    if (status) {
      conditions.push(`l.status = $${params.length + 1}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(l.lead_name ILIKE $${params.length + 1} OR l.destination ILIKE $${params.length + 1} OR l.mobile_number ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.updated_at DESC, l.created_at DESC';

    const leadsRes = await db.query(query, params);
    return res.json(leadsRes.rows);
  } catch (err) {
    console.error('Get Leads Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching leads catalog' });
  }
};

/**
 * Get detailed lead file with follow-up transaction history
 */
const getLeadById = async (req, res) => {
  const { id } = req.params;

  try {
    const leadQuery = `
      SELECT l.*, u.name AS assigned_staff_name, u.email AS assigned_staff_email
      FROM leads l
      LEFT JOIN users u ON l.assigned_staff_id = u.id
      WHERE l.id = $1
    `;
    const leadRes = await db.query(leadQuery, [id]);

    if (leadRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lead profile not found' });
    }

    const lead = leadRes.rows[0];

    // Follow-ups log feed
    const logsQuery = `
      SELECT * FROM lead_follow_ups
      WHERE lead_id = $1
      ORDER BY follow_up_date DESC, created_at DESC
    `;
    const logsRes = await db.query(logsQuery, [id]);
    lead.follow_ups = logsRes.rows;

    return res.json(lead);
  } catch (err) {
    console.error('Get Lead ID Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching lead transactions' });
  }
};

/**
 * Add / Create Lead
 */
const createLead = async (req, res) => {
  const { lead_name, mobile_number, destination, package_interested, budget, source, assigned_staff_id, notes } = req.body;

  if (!lead_name || !mobile_number || !destination || !package_interested || !budget) {
    return res.status(400).json({ 
      error: 'Lead name, contact number, destination, package, and budget are required fields' 
    });
  }

  try {
    const insertQuery = `
      INSERT INTO leads (
        lead_name, mobile_number, destination, package_interested, budget, source, status, assigned_staff_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'new_lead', $7, $8)
      RETURNING *
    `;

    const values = [
      lead_name, mobile_number, destination, package_interested,
      parseFloat(budget), source || 'Direct Enquiry',
      assigned_staff_id || null, notes || ''
    ];

    const result = await db.query(insertQuery, values);
    const newLead = result.rows[0];
    try {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [assigned_staff_id || null, 'New Lead Allocated', `Lead "${lead_name}" for "${destination}" package has been registered.`, 'lead_update']
      );
    } catch (nErr) {
      console.error('Lead notification error:', nErr);
    }
    return res.status(201).json(newLead);
  } catch (err) {
    console.error('Create Lead Error:', err);
    return res.status(500).json({ error: 'Internal server error recording new lead' });
  }
};

/**
 * Update lead profile details or status (e.g. converting lead to sales Booking Confirmed)
 */
const updateLead = async (req, res) => {
  const { id } = req.params;
  const { lead_name, mobile_number, destination, package_interested, budget, source, status, assigned_staff_id, notes } = req.body;

  try {
    const checkQuery = 'SELECT * FROM leads WHERE id = $1';
    const checkRes = await db.query(checkQuery, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = checkRes.rows[0];

    const updateQuery = `
      UPDATE leads
      SET lead_name = $1, mobile_number = $2, destination = $3, package_interested = $4,
          budget = $5, source = $6, status = $7, assigned_staff_id = $8, notes = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      lead_name || lead.lead_name,
      mobile_number || lead.mobile_number,
      destination || lead.destination,
      package_interested || lead.package_interested,
      budget !== undefined ? parseFloat(budget) : lead.budget,
      source || lead.source,
      status || lead.status,
      assigned_staff_id !== undefined ? assigned_staff_id : lead.assigned_staff_id,
      notes !== undefined ? notes : lead.notes,
      id
    ];

    const result = await db.query(updateQuery, values);
    const updatedLead = result.rows[0];
    if (lead.status !== updatedLead.status) {
      try {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [updatedLead.assigned_staff_id || null, 'Lead Status Changed', `Lead "${updatedLead.lead_name}" status changed to ${updatedLead.status.toUpperCase()}.`, 'lead_update']
        );
      } catch (nErr) {
        console.error('Lead update notification error:', nErr);
      }
    }
    return res.json(updatedLead);
  } catch (err) {
    console.error('Update Lead Error:', err);
    return res.status(500).json({ error: 'Internal server error updating lead information' });
  }
};

/**
 * Record a new follow-up interaction entry
 */
const addFollowUp = async (req, res) => {
  const { id } = req.params; // Lead ID
  const { follow_up_date, notes } = req.body;

  if (!notes || !follow_up_date) {
    return res.status(400).json({ error: 'Follow up interaction notes and date are required' });
  }

  try {
    const checkQuery = 'SELECT lead_name FROM leads WHERE id = $1';
    const checkRes = await db.query(checkQuery, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lead profile not found' });
    }

    const insertQuery = `
      INSERT INTO lead_follow_ups (lead_id, follow_up_date, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [id, follow_up_date, notes]);

    // Also update lead's `updated_at` time
    await db.query('UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add Follow Up Error:', err);
    return res.status(500).json({ error: 'Internal server error recording follow up log' });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addFollowUp
};
