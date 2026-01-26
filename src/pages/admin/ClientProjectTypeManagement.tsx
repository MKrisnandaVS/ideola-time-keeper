import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { clearSession, isAdmin } from "@/services/auth.service";
import {
  Client,
  ProjectType,
  fetchAllClients,
  fetchAllProjectTypes,
  addClient,
  updateClient,
  deleteClient,
  addProjectType,
  updateProjectType,
  deleteProjectType,
  initializeDatabase,
} from "@/services/client-project-type.service";

const ClientProjectTypeManagement = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for client dialog
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientFormData, setClientFormData] = useState({
    name: "",
    description: "",
  });
  
  // State for project type dialog
  const [isProjectTypeDialogOpen, setIsProjectTypeDialogOpen] = useState(false);
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null);
  const [projectTypeFormData, setProjectTypeFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (!isAdmin()) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log("Starting data fetch...");
      
      // Check if database needs initialization/manual setup
      const initResult = await initializeDatabase();
      
      const [clientsData, projectTypesData] = await Promise.all([
        fetchAllClients(),
        fetchAllProjectTypes(),
      ]);
      
      console.log("Clients data received:", clientsData);
      console.log("Project types data received:", projectTypesData);
      
      setClients(clientsData);
      setProjectTypes(projectTypesData);
      
      // Show appropriate messages
      if (initResult.needsManualSetup) {
        toast.info("Database tables are empty. Please add clients and project types manually.");
      } else if (clientsData.length === 0 && projectTypesData.length === 0) {
        toast.info("No clients or project types found - you can add new ones");
      } else if (clientsData.length === 0) {
        toast.info("No clients found - you can add new clients");
      } else if (projectTypesData.length === 0) {
        toast.info("No project types found - you can add new project types");
      }
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      console.error("Error details:", error.message, error.code);
      
      // Handle RLS policy violations specifically
      if (error.code === '42501') {
        toast.error("Access denied. Please ensure you're logged in as admin and database is properly configured.");
      } else {
        toast.error(`Failed to load data: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenClientDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientFormData({
        name: client.name,
        description: client.description || "",
      });
    } else {
      setEditingClient(null);
      setClientFormData({
        name: "",
        description: "",
      });
    }
    setIsClientDialogOpen(true);
  };

  const handleCloseClientDialog = () => {
    setIsClientDialogOpen(false);
    setEditingClient(null);
    setClientFormData({
      name: "",
      description: "",
    });
  };

  const handleOpenProjectTypeDialog = (projectType?: ProjectType) => {
    if (projectType) {
      setEditingProjectType(projectType);
      setProjectTypeFormData({
        name: projectType.name,
        description: projectType.description || "",
      });
    } else {
      setEditingProjectType(null);
      setProjectTypeFormData({
        name: "",
        description: "",
      });
    }
    setIsProjectTypeDialogOpen(true);
  };

  const handleCloseProjectTypeDialog = () => {
    setIsProjectTypeDialogOpen(false);
    setEditingProjectType(null);
    setProjectTypeFormData({
      name: "",
      description: "",
    });
  };

  const handleSaveClient = async () => {
    if (!clientFormData.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    
    // Validate that the name contains only uppercase letters, numbers, spaces, and common punctuation
    if (clientFormData.name !== clientFormData.name.toUpperCase()) {
      toast.error("Client name must be in uppercase");
      return;
    }

    try {
      if (editingClient) {
        await updateClient(
          editingClient.id,
          clientFormData.name,
          clientFormData.description
        );
        toast.success("Client updated successfully");
      } else {
        await addClient(clientFormData.name, clientFormData.description);
        toast.success("Client added successfully");
      }
      handleCloseClientDialog();
      fetchData();
    } catch (error: any) {
      console.error("Error saving client:", error);
      if (error.code === "23505") {
        toast.error("Client name already exists");
      } else {
        toast.error("Failed to save client");
      }
    }
  };

  const handleSaveProjectType = async () => {
    if (!projectTypeFormData.name.trim()) {
      toast.error("Project type name is required");
      return;
    }
    
    // Validate that the name contains only uppercase letters, numbers, spaces, and common punctuation
    if (projectTypeFormData.name !== projectTypeFormData.name.toUpperCase()) {
      toast.error("Project type name must be in uppercase");
      return;
    }

    try {
      if (editingProjectType) {
        await updateProjectType(
          editingProjectType.id,
          projectTypeFormData.name,
          projectTypeFormData.description
        );
        toast.success("Project type updated successfully");
      } else {
        await addProjectType(projectTypeFormData.name, projectTypeFormData.description);
        toast.success("Project type added successfully");
      }
      handleCloseProjectTypeDialog();
      fetchData();
    } catch (error: any) {
      console.error("Error saving project type:", error);
      if (error.code === "23505") {
        toast.error("Project type name already exists");
      } else {
        toast.error("Failed to save project type");
      }
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      return;
    }

    try {
      await deleteClient(client.id);
      toast.success("Client deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  const handleDeleteProjectType = async (projectType: ProjectType) => {
    if (!confirm(`Are you sure you want to delete project type "${projectType.name}"?`)) {
      return;
    }

    try {
      await deleteProjectType(projectType.id);
      toast.success("Project type deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting project type:", error);
      toast.error("Failed to delete project type");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Clients Card */}
        <Card className="bg-card border-border rounded-xl hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg uppercase tracking-wider">
              Clients
              <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                Manage client organizations
              </span>
            </CardTitle>
            <Button
              onClick={() => handleOpenClientDialog()}
              className="uppercase bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium font-mono">
                        {client.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenClientDialog(client)}
                            className="hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClient(client)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Project Types Card */}
        <Card className="bg-card border-border rounded-xl hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg uppercase tracking-wider">
              Project Types
              <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                Manage project type categories
              </span>
            </CardTitle>
            <Button
              onClick={() => handleOpenProjectTypeDialog()}
              className="uppercase bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project Type
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTypes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No project types found
                    </TableCell>
                  </TableRow>
                ) : (
                  projectTypes.map((projectType) => (
                    <TableRow key={projectType.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium font-mono">
                        {projectType.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {projectType.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenProjectTypeDialog(projectType)}
                            className="hover:bg-muted"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProjectType(projectType)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Client Dialog */}
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wider">
                {editingClient ? "Edit Client" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  value={clientFormData.name}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, name: e.target.value.toUpperCase() })
                  }
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-description">Description</Label>
                <Textarea
                  id="client-description"
                  value={clientFormData.description}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, description: e.target.value })
                  }
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseClientDialog}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveClient}>
                {editingClient ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Type Dialog */}
        <Dialog open={isProjectTypeDialogOpen} onOpenChange={setIsProjectTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wider">
                {editingProjectType ? "Edit Project Type" : "Add New Project Type"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-type-name">Project Type Name</Label>
                <Input
                  id="project-type-name"
                  value={projectTypeFormData.name}
                  onChange={(e) =>
                    setProjectTypeFormData({ ...projectTypeFormData, name: e.target.value.toUpperCase() })
                  }
                  placeholder="Enter project type name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-type-description">Description</Label>
                <Textarea
                  id="project-type-description"
                  value={projectTypeFormData.description}
                  onChange={(e) =>
                    setProjectTypeFormData({ ...projectTypeFormData, description: e.target.value })
                  }
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseProjectTypeDialog}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProjectType}>
                {editingProjectType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ClientProjectTypeManagement;