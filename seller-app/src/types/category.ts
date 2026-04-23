export interface SellerCategoryTreeNode {
  id: number;
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
  children: SellerCategoryTreeNode[];
}

export interface SellerCategoryOption {
  id: number;
  label: string;
  parent_label?: string;
}
