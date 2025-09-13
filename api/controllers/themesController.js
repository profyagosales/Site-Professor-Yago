const Theme = require('../models/Theme');

// Listar temas com paginação e busca
exports.getThemes = async (req, res, next) => {
  try {
    const { query = '', page = 1, limit = 10, active } = req.query;
    
    const filter = {};
    
    // Adicionar filtro de texto na busca
    if (query) {
      filter.title = { $regex: query, $options: 'i' };
    }
    
    // Filtrar por status ativo
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    const options = {
      sort: { createdAt: -1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    };
    
    const [themes, total] = await Promise.all([
      Theme.find(filter, null, options).populate('createdBy', 'name'),
      Theme.countDocuments(filter)
    ]);
    
    res.json({
      themes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Criar novo tema
exports.createTheme = async (req, res, next) => {
  try {
    const { title, active } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Título é obrigatório' });
    }
    
    const theme = new Theme({
      title,
      active: active !== undefined ? active : true,
      createdBy: req.user.id
    });
    
    await theme.save();
    
    res.status(201).json(theme);
  } catch (error) {
    next(error);
  }
};

// Atualizar tema existente
exports.updateTheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, active } = req.body;
    
    const theme = await Theme.findById(id);
    
    if (!theme) {
      return res.status(404).json({ message: 'Tema não encontrado' });
    }
    
    if (title !== undefined) {
      theme.title = title;
    }
    
    if (active !== undefined) {
      theme.active = active;
    }
    
    await theme.save();
    
    res.json(theme);
  } catch (error) {
    next(error);
  }
};

// Arquivar tema (soft delete)
exports.archiveTheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const theme = await Theme.findById(id);
    if (!theme) {
      return res.status(404).json({ message: 'Tema não encontrado' });
    }
    theme.active = false;
    await theme.save();
    res.json(theme);
  } catch (error) {
    next(error);
  }
};

// Restaurar tema (soft restore)
exports.restoreTheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    const theme = await Theme.findById(id);
    if (!theme) {
      return res.status(404).json({ message: 'Tema não encontrado' });
    }
    theme.active = true;
    await theme.save();
    res.json(theme);
  } catch (error) {
    next(error);
  }
};
