const Client = require('../models/Client');
const Report = require('../models/Report');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Public / Authenticated
const getClients = async (req, res, next) => {
  try {
    const [clients, reports] = await Promise.all([
      Client.find().sort({ name: 1 }).lean(),
      Report.find({}, 'client').lean()
    ]);

    const reportCounts = {};
    reports.forEach((r) => {
      if (r.client) {
        reportCounts[r.client] = (reportCounts[r.client] || 0) + 1;
      }
    });

    const enriched = clients.map((c) => ({
      ...c,
      reportsCount: reportCounts[c.name] || 0
    }));

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Admin Only
const createClient = async (req, res, next) => {
  try {
    const { name, suburbs, contactEmail } = req.body;

    const existing = await Client.findOne({ name });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Client "${name}" already exists.`
      });
    }

    const newClient = await Client.create({
      name,
      suburbs: suburbs || [],
      contactEmail: contactEmail || ''
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: newClient
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Admin Only
const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    let client;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      client = await Client.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    } else {
      client = await Client.findOneAndUpdate({ name: id }, payload, {
        new: true,
        runValidators: true
      });
    }

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Admin Only
const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    let deleted;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await Client.findByIdAndDelete(id);
    } else {
      deleted = await Client.findOneAndDelete({ name: id });
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getClients,
  createClient,
  updateClient,
  deleteClient
};

