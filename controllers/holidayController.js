const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

exports.getAllHolidays = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  try {
    const result = await db.query('SELECT * FROM holidays ORDER BY date ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get All Holidays Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createHoliday = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });
  
  // Only admin or super_admin or manager can create
  const role = req.user.role;
  if (!['admin', 'super_admin', 'manager', 'managing_director'].includes(role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, date, type, description } = req.body;
  
  try {
    const insertQuery = `
      INSERT INTO holidays (name, date, type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [name, date, type, description]);
    res.status(201).json({ message: 'Holiday created successfully', holiday: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ error: 'A holiday already exists for this date.' });
    }
    console.error('Create Holiday Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateHoliday = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  const role = req.user.role;
  if (!['admin', 'super_admin', 'manager', 'managing_director'].includes(role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;
  const { name, date, type, description } = req.body;

  try {
    const updateQuery = `
      UPDATE holidays 
      SET name = $1, date = $2, type = $3, description = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await db.query(updateQuery, [name, date, type, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.json({ message: 'Holiday updated successfully', holiday: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A holiday already exists for this date.' });
    }
    console.error('Update Holiday Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteHoliday = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  const role = req.user.role;
  if (!['admin', 'super_admin', 'manager', 'managing_director'].includes(role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM holidays WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Delete Holiday Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
