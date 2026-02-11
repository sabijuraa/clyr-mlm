import { query, transaction } from '../config/database.js';

/**
 * CLYR Academy Controller
 * Handles partner training content and progress tracking
 */

/**
 * Get all academy content for the partner's rank level
 */
export const getContent = async (req, res) => {
  try {
    const { category, type } = req.query;
    
    // Get partner's rank level
    const userResult = await query(
      `SELECT r.level FROM users u
       JOIN ranks r ON u.rank_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    
    const rankLevel = userResult.rows[0]?.level || 1;

    let queryStr = `
      SELECT ac.*, ap.status as progress_status, ap.progress_percent, ap.completed_at
      FROM academy_content ac
      LEFT JOIN academy_progress ap ON ac.id = ap.content_id AND ap.user_id = $1
      WHERE ac.is_active = true AND ac.min_rank_level <= $2
    `;
    const params = [req.user.id, rankLevel];

    if (category) {
      params.push(category);
      queryStr += ` AND ac.category = $${params.length}`;
    }

    if (type) {
      params.push(type);
      queryStr += ` AND ac.type = $${params.length}`;
    }

    queryStr += ' ORDER BY ac.is_required DESC, ac.sort_order ASC, ac.created_at ASC';

    const result = await query(queryStr, params);

    // Calculate overall progress
    const totalContent = result.rows.length;
    const completedContent = result.rows.filter(c => c.progress_status === 'completed').length;
    const requiredContent = result.rows.filter(c => c.is_required);
    const completedRequired = requiredContent.filter(c => c.progress_status === 'completed').length;

    res.json({
      success: true,
      data: {
        content: result.rows,
        progress: {
          total: totalContent,
          completed: completedContent,
          percentComplete: totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0,
          requiredTotal: requiredContent.length,
          requiredCompleted: completedRequired,
          isOnboardingComplete: completedRequired === requiredContent.length
        }
      }
    });
  } catch (error) {
    console.error('Error getting academy content:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Academy-Inhalte'
    });
  }
};

/**
 * Get single content item
 */
export const getContentItem = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT ac.*, ap.status as progress_status, ap.progress_percent, ap.completed_at
       FROM academy_content ac
       LEFT JOIN academy_progress ap ON ac.id = ap.content_id AND ap.user_id = $1
       WHERE ac.slug = $2 AND ac.is_active = true`,
      [req.user.id, slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inhalt nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting content item:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Inhalts'
    });
  }
};

/**
 * Update progress for a content item
 */
export const updateProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { status, progressPercent } = req.body;

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Status'
      });
    }

    const completedAt = status === 'completed' ? new Date() : null;

    const result = await query(
      `INSERT INTO academy_progress (user_id, content_id, status, progress_percent, completed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, content_id) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         progress_percent = EXCLUDED.progress_percent,
         completed_at = COALESCE(EXCLUDED.completed_at, academy_progress.completed_at),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, contentId, status, progressPercent || 0, completedAt]
    );

    // Check if all required content is completed
    const requiredCheck = await query(
      `SELECT 
        COUNT(ac.id) as total,
        COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as completed
       FROM academy_content ac
       LEFT JOIN academy_progress ap ON ac.id = ap.content_id AND ap.user_id = $1
       WHERE ac.is_required = true AND ac.is_active = true`,
      [req.user.id]
    );

    const { total, completed } = requiredCheck.rows[0];
    const onboardingComplete = parseInt(completed) >= parseInt(total);

    res.json({
      success: true,
      data: {
        progress: result.rows[0],
        onboardingComplete
      }
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Fortschritts'
    });
  }
};

/**
 * Mark content as completed
 */
export const markComplete = async (req, res) => {
  try {
    const { contentId } = req.params;

    const result = await query(
      `INSERT INTO academy_progress (user_id, content_id, status, progress_percent, completed_at)
       VALUES ($1, $2, 'completed', 100, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, content_id) 
       DO UPDATE SET 
         status = 'completed',
         progress_percent = 100,
         completed_at = COALESCE(academy_progress.completed_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, contentId]
    );

    res.json({
      success: true,
      message: 'Inhalt als abgeschlossen markiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking complete:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren als abgeschlossen'
    });
  }
};

/**
 * Get progress overview
 */
export const getProgressOverview = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        ac.category,
        COUNT(ac.id) as total,
        COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as completed,
        COUNT(ap.id) FILTER (WHERE ap.status = 'in_progress') as in_progress
       FROM academy_content ac
       LEFT JOIN academy_progress ap ON ac.id = ap.content_id AND ap.user_id = $1
       WHERE ac.is_active = true
       GROUP BY ac.category
       ORDER BY ac.category`,
      [req.user.id]
    );

    const categories = result.rows.map(row => ({
      category: row.category,
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      inProgress: parseInt(row.in_progress),
      percentComplete: parseInt(row.total) > 0 
        ? Math.round((parseInt(row.completed) / parseInt(row.total)) * 100) 
        : 0
    }));

    // Overall stats
    const totals = categories.reduce((acc, cat) => ({
      total: acc.total + cat.total,
      completed: acc.completed + cat.completed,
      inProgress: acc.inProgress + cat.inProgress
    }), { total: 0, completed: 0, inProgress: 0 });

    res.json({
      success: true,
      data: {
        categories,
        overall: {
          ...totals,
          percentComplete: totals.total > 0 
            ? Math.round((totals.completed / totals.total) * 100) 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting progress overview:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fortschrittsübersicht'
    });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Create new academy content (admin)
 */
export const createContent = async (req, res) => {
  try {
    const b = req.body;
    const title = b.title;
    const titleEn = b.titleEn || b.title_en || '';
    const slug = b.slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const description = b.description || '';
    const descriptionEn = b.descriptionEn || b.description_en || '';
    const type = b.type || b.content_type || 'article';
    const category = b.category || 'getting-started';
    const contentUrl = b.contentUrl || b.content_url || b.video_url || '';
    const contentText = b.contentText || b.content_text || b.content_body || '';
    const durationMinutes = b.durationMinutes || b.duration_minutes || 0;
    const minRankLevel = b.minRankLevel || b.min_rank_level || 1;
    const isRequired = b.isRequired || b.is_required || false;
    const sortOrder = b.sortOrder || b.sort_order || 0;

    const result = await query(
      `INSERT INTO academy_content (
        title, title_en, slug, description, description_en,
        type, category, content_url, content_text,
        duration_minutes, min_rank_level, is_required, sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        title, titleEn, slug, description, descriptionEn,
        type, category, contentUrl, contentText,
        durationMinutes, minRankLevel || 1, isRequired || false, sortOrder || 0
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Academy-Inhalt erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating content:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Ein Inhalt mit diesem Slug existiert bereits'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Inhalts'
    });
  }
};

/**
 * Update academy content (admin)
 */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    // Accept both camelCase and snake_case field names
    const title = b.title;
    const titleEn = b.titleEn || b.title_en;
    const description = b.description;
    const descriptionEn = b.descriptionEn || b.description_en;
    const type = b.type || b.content_type;
    const category = b.category;
    const contentUrl = b.contentUrl || b.content_url || b.video_url;
    const contentText = b.contentText || b.content_text || b.content_body;
    const durationMinutes = b.durationMinutes || b.duration_minutes;
    const minRankLevel = b.minRankLevel || b.min_rank_level;
    const isRequired = b.isRequired !== undefined ? b.isRequired : b.is_required;
    const sortOrder = b.sortOrder || b.sort_order;
    const isActive = b.isActive !== undefined ? b.isActive : b.is_active;

    const result = await query(
      `UPDATE academy_content SET
        title = COALESCE($1, title),
        title_en = COALESCE($2, title_en),
        description = COALESCE($3, description),
        description_en = COALESCE($4, description_en),
        type = COALESCE($5, type),
        category = COALESCE($6, category),
        content_url = COALESCE($7, content_url),
        content_text = COALESCE($8, content_text),
        duration_minutes = COALESCE($9, duration_minutes),
        min_rank_level = COALESCE($10, min_rank_level),
        is_required = COALESCE($11, is_required),
        sort_order = COALESCE($12, sort_order),
        is_active = COALESCE($13, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        title, titleEn, description, descriptionEn,
        type, category, contentUrl, contentText,
        durationMinutes, minRankLevel, isRequired, sortOrder, isActive, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inhalt nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Academy-Inhalt aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Inhalts'
    });
  }
};

/**
 * Delete academy content (admin)
 */
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM academy_progress WHERE content_id = $1', [id]);
    const result = await query('DELETE FROM academy_content WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inhalt nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Academy-Inhalt gelöscht'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Inhalts'
    });
  }
};

/**
 * Get all content for admin (no rank filter)
 */
export const getAllContent = async (req, res) => {
  try {
    const result = await query(
      `SELECT ac.*, 
        COUNT(ap.id) as total_progress,
        COUNT(ap.id) FILTER (WHERE ap.status = 'completed') as completed_count
       FROM academy_content ac
       LEFT JOIN academy_progress ap ON ac.id = ap.content_id
       GROUP BY ac.id
       ORDER BY ac.sort_order ASC, ac.created_at ASC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting all content:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Inhalte'
    });
  }
};

/**
 * Get partner progress stats (admin)
 */
export const getPartnerProgressStats = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const result = await query(
      `SELECT ac.*, ap.status as progress_status, ap.progress_percent, ap.completed_at
       FROM academy_content ac
       LEFT JOIN academy_progress ap ON ac.id = ap.content_id AND ap.user_id = $1
       WHERE ac.is_active = true
       ORDER BY ac.sort_order ASC`,
      [partnerId]
    );

    const completed = result.rows.filter(r => r.progress_status === 'completed').length;

    res.json({
      success: true,
      data: {
        content: result.rows,
        summary: {
          total: result.rows.length,
          completed,
          percentComplete: result.rows.length > 0 
            ? Math.round((completed / result.rows.length) * 100) 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting partner progress:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Partner-Fortschritts'
    });
  }
};
