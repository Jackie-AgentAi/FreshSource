package service

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

var (
	ErrCategoryNotFound       = errors.New("category not found")
	ErrCategoryParentNotFound = errors.New("parent category not found")
	ErrCategoryDeleteBlocked  = errors.New("category has children or products")
	ErrCategoryNameRequired   = errors.New("category name required")
)

type CategoryService struct {
	repo *repository.CategoryRepository
}

type CategoryTreeNode struct {
	ID        uint64             `json:"id"`
	ParentID  uint64             `json:"parent_id"`
	Name      string             `json:"name"`
	Icon      string             `json:"icon"`
	SortOrder int                `json:"sort_order"`
	Status    int                `json:"status"`
	Children  []CategoryTreeNode `json:"children"`
}

type SaveCategoryInput struct {
	ParentID  uint64 `json:"parent_id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sort_order"`
	Status    int    `json:"status"`
}

func NewCategoryService(repo *repository.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) GetBuyerTree(ctx context.Context) ([]CategoryTreeNode, error) {
	categories, err := s.repo.ListVisible(ctx)
	if err != nil {
		return nil, err
	}
	return trimToTwoLevels(buildCategoryTree(categories)), nil
}

func (s *CategoryService) GetAdminTree(ctx context.Context) ([]CategoryTreeNode, error) {
	categories, err := s.repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	return buildCategoryTree(categories), nil
}

func (s *CategoryService) Create(ctx context.Context, input SaveCategoryInput) (*model.Category, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, ErrCategoryNameRequired
	}
	if input.ParentID > 0 {
		if _, err := s.repo.FindByID(ctx, input.ParentID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrCategoryParentNotFound
			}
			return nil, err
		}
	}

	category := &model.Category{
		ParentID:  input.ParentID,
		Name:      strings.TrimSpace(input.Name),
		Icon:      strings.TrimSpace(input.Icon),
		SortOrder: input.SortOrder,
		Status:    normalizeStatus(input.Status),
	}

	if err := s.repo.Create(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *CategoryService) Update(ctx context.Context, id uint64, input SaveCategoryInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return ErrCategoryNameRequired
	}
	if id == 0 {
		return ErrCategoryNotFound
	}
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCategoryNotFound
		}
		return err
	}
	if input.ParentID == id {
		return ErrCategoryParentNotFound
	}
	if input.ParentID > 0 {
		if _, err := s.repo.FindByID(ctx, input.ParentID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrCategoryParentNotFound
			}
			return err
		}
	}

	return s.repo.Update(ctx, id, map[string]interface{}{
		"parent_id":  input.ParentID,
		"name":       strings.TrimSpace(input.Name),
		"icon":       strings.TrimSpace(input.Icon),
		"sort_order": input.SortOrder,
		"status":     normalizeStatus(input.Status),
	})
}

func (s *CategoryService) Delete(ctx context.Context, id uint64) error {
	if id == 0 {
		return ErrCategoryNotFound
	}
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCategoryNotFound
		}
		return err
	}

	childrenCount, err := s.repo.CountChildren(ctx, id)
	if err != nil {
		return err
	}
	productsCount, err := s.repo.CountProducts(ctx, id)
	if err != nil {
		return err
	}
	if childrenCount > 0 || productsCount > 0 {
		return ErrCategoryDeleteBlocked
	}
	return s.repo.Delete(ctx, id)
}

func buildCategoryTree(categories []model.Category) []CategoryTreeNode {
	treeByParent := make(map[uint64][]CategoryTreeNode)
	for _, c := range categories {
		node := CategoryTreeNode{
			ID:        c.ID,
			ParentID:  c.ParentID,
			Name:      c.Name,
			Icon:      c.Icon,
			SortOrder: c.SortOrder,
			Status:    c.Status,
			Children:  []CategoryTreeNode{},
		}
		treeByParent[c.ParentID] = append(treeByParent[c.ParentID], node)
	}
	return fillChildren(0, treeByParent)
}

func fillChildren(parentID uint64, treeByParent map[uint64][]CategoryTreeNode) []CategoryTreeNode {
	nodes := treeByParent[parentID]
	result := make([]CategoryTreeNode, 0, len(nodes))
	for _, node := range nodes {
		node.Children = fillChildren(node.ID, treeByParent)
		result = append(result, node)
	}
	return result
}

func trimToTwoLevels(tree []CategoryTreeNode) []CategoryTreeNode {
	trimmed := make([]CategoryTreeNode, 0, len(tree))
	for _, root := range tree {
		next := root
		children := make([]CategoryTreeNode, 0, len(root.Children))
		for _, child := range root.Children {
			childNode := child
			childNode.Children = []CategoryTreeNode{}
			children = append(children, childNode)
		}
		next.Children = children
		trimmed = append(trimmed, next)
	}
	return trimmed
}

func normalizeStatus(status int) int {
	if status == 0 {
		return 0
	}
	return 1
}
